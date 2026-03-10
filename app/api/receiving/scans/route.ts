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
import { recordReceivingScan, postReceivingScanToLedger, SkuNotFoundError } from "@/lib/inventory/receivingService"

const RECEIVING_ROLES = ["warehouse_manager", "business_owner", "platform_owner"] as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const tenantId   = requireString(body.tenantId, "tenantId")
    const sessionId  = requireString(body.sessionId, "sessionId")
    const shipmentId = requireString(body.shipmentId, "shipmentId")

    const entryMode: "barcode" | "sku" = body.entryMode === "sku" ? "sku" : "barcode"

    if (entryMode === "barcode" && !body.barcode) {
      return NextResponse.json({ error: "'barcode' is required in barcode mode." }, { status: 400 })
    }
    if (entryMode === "sku" && !body.sku) {
      return NextResponse.json({ error: "'sku' is required in sku mode." }, { status: 400 })
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
      barcode: entryMode === "barcode" ? (body.barcode ?? undefined) : undefined,
      sku: entryMode === "sku" ? (body.sku ?? undefined) : (body.sku ?? undefined),
      scannedQty: typeof body.scannedQty === "number" ? body.scannedQty : 1,
      entryMode,
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
    if (err instanceof SkuNotFoundError) {
      return NextResponse.json({ error: err.message, code: "sku_not_found" }, { status: 422 })
    }
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/receiving/scans POST]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
