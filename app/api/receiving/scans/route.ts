/**
 * POST /api/receiving/scans — Record a scan and optionally post it to ledger
 *
 * Body: {
 *   tenantId, sessionId, shipmentId,
 *   barcode?, sku?, scannedQty?,
 *   postToLedger?   — if true, immediately posts matched scans
 * }
 * Returns: { scanId, outcome, resolvedSku, resolvedBaseQty, expectedQty,
 *            exceptionCode, movementId? }
 */
import { NextRequest, NextResponse } from "next/server"
import { AuthError, resolveAuth, requireTenantAccess, requireRole, requireString, logAuditEvent } from "@/lib/authz"
import { createAdminClient } from "@/lib/supabase/server"
import { recordReceivingScan, postReceivingScanToLedger } from "@/lib/inventory/receivingService"

const RECEIVING_ROLES = ["warehouse_manager", "business_owner", "platform_owner"] as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const tenantId   = requireString(body.tenantId, "tenantId")
    const sessionId  = requireString(body.sessionId, "sessionId")
    const shipmentId = requireString(body.shipmentId, "shipmentId")

    if (!body.barcode && !body.sku) {
      return NextResponse.json({ error: "Either 'barcode' or 'sku' is required." }, { status: 400 })
    }

    const { appUser, devMode } = await resolveAuth(tenantId)
    if (!devMode) {
      requireTenantAccess(appUser!, tenantId)
      requireRole(appUser!, [...RECEIVING_ROLES])
    }

    const admin = createAdminClient()

    // Verify session belongs to tenant and is open
    const { data: session } = await admin
      .from("receiving_sessions")
      .select("id, status, tenant_id")
      .eq("id", sessionId)
      .single()

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 })
    }
    if (!devMode && session.tenant_id !== tenantId) {
      return NextResponse.json({ error: "Tenant mismatch." }, { status: 403 })
    }
    if (session.status !== "open") {
      return NextResponse.json({ error: `Session is ${session.status}, not open.` }, { status: 409 })
    }

    const scanResult = await recordReceivingScan(admin, tenantId, sessionId, shipmentId, {
      barcode: body.barcode,
      sku: body.sku,
      scannedQty: typeof body.scannedQty === "number" ? body.scannedQty : 1,
    })

    let movementId: string | undefined
    let postedQty: number | undefined

    // Auto-post to ledger if requested and scan matched or unmatched (has inventory item)
    if (
      body.postToLedger &&
      (scanResult.outcome === "matched" || scanResult.outcome === "unmatched")
    ) {
      try {
        const posted = await postReceivingScanToLedger(admin, tenantId, scanResult.scanId, appUser?.id ?? null)
        movementId = posted.movementId
        postedQty = posted.resolvedQty
      } catch (postErr) {
        // Non-fatal: scan recorded but not posted (e.g. inventory item not found)
        console.warn("[api/receiving/scans] Post to ledger failed:", postErr)
      }
    }

    await logAuditEvent(admin, tenantId, appUser?.id ?? null, "receiving.scan", scanResult.scanId, {
      outcome: scanResult.outcome,
      sku: scanResult.resolvedSku,
      movementId,
    })

    return NextResponse.json({
      scanId: scanResult.scanId,
      outcome: movementId ? "posted" : scanResult.outcome,
      resolvedSku: scanResult.resolvedSku,
      resolvedBaseQty: scanResult.resolvedBaseQty,
      expectedQty: scanResult.expectedQty,
      exceptionCode: scanResult.exceptionCode,
      movementId,
      postedQty,
    }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/receiving/scans POST]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
