/**
 * GET   /api/receiving/exceptions/[id] — Exception detail (with linked scan)
 * PATCH /api/receiving/exceptions/[id] — Approve / reject / resolve / resolve_barcode
 *
 * PATCH body actions:
 *   { action: "approve",          tenantId, notes? }
 *   { action: "reject",           tenantId, notes? }
 *   { action: "resolve",          tenantId, resolutionAction?, resolutionNotes? }
 *   { action: "resolve_barcode",  tenantId, productId, uomCode, qtyPerUnit,
 *                                 barcodeType?, isPrimary?, repostScan?, resolutionNotes? }
 */
import { NextRequest, NextResponse } from "next/server"
import {
  AuthError, resolveAuth, requireTenantAccess, requireRole,
  requireString, logAuditEvent,
} from "@/lib/authz"
import { createAdminClient } from "@/lib/supabase/server"
import {
  getReceivingException,
  approveReceivingException,
  rejectReceivingException,
  resolveReceivingException,
  resolveUnknownBarcode,
} from "@/lib/inventory/receivingExceptionService"

const ROLES = ["warehouse_manager", "business_owner", "platform_owner"] as const

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get("tenantId")
    if (!tenantId) return NextResponse.json({ error: "tenantId is required." }, { status: 400 })

    const { appUser, devMode } = await resolveAuth(tenantId)
    if (!devMode) {
      requireTenantAccess(appUser!, tenantId)
      requireRole(appUser!, [...ROLES])
    }

    const admin = createAdminClient()
    const exception = await getReceivingException(admin, tenantId, id)
    if (!exception) return NextResponse.json({ error: "Exception not found." }, { status: 404 })

    return NextResponse.json({ exception })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/receiving/exceptions/[id] GET]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const tenantId = requireString(body.tenantId, "tenantId")
    const action: string = body.action ?? "resolve"

    const { appUser, devMode } = await resolveAuth(tenantId)
    if (!devMode) {
      requireTenantAccess(appUser!, tenantId)
      requireRole(appUser!, [...ROLES])
    }

    const admin = createAdminClient()
    const actorId = appUser?.id ?? null

    if (action === "approve") {
      await approveReceivingException(admin, tenantId, id, actorId, body.notes)
      await logAuditEvent(admin, tenantId, actorId, "receiving.exception.approve", id)
      return NextResponse.json({ ok: true, status: "approved" })
    }

    if (action === "reject") {
      await rejectReceivingException(admin, tenantId, id, actorId, body.notes)
      await logAuditEvent(admin, tenantId, actorId, "receiving.exception.reject", id)
      return NextResponse.json({ ok: true, status: "rejected" })
    }

    if (action === "resolve") {
      await resolveReceivingException(admin, tenantId, id, {
        resolutionAction: body.resolutionAction ?? "dismissed",
        resolutionNotes: body.resolutionNotes,
        actorId,
      })
      await logAuditEvent(admin, tenantId, actorId, "receiving.exception.resolve", id, {
        resolutionAction: body.resolutionAction,
      })
      return NextResponse.json({ ok: true, status: "resolved" })
    }

    if (action === "resolve_barcode") {
      if (!body.productId) return NextResponse.json({ error: "productId is required." }, { status: 400 })
      if (!body.uomCode)   return NextResponse.json({ error: "uomCode is required." }, { status: 400 })
      if (typeof body.qtyPerUnit !== "number" || body.qtyPerUnit < 1) {
        return NextResponse.json({ error: "qtyPerUnit must be a positive integer." }, { status: 400 })
      }

      const result = await resolveUnknownBarcode(admin, tenantId, id, {
        productId: body.productId,
        uomCode: body.uomCode,
        qtyPerUnit: body.qtyPerUnit,
        barcodeType: body.barcodeType,
        isPrimary: body.isPrimary ?? false,
        repostScan: body.repostScan ?? false,
        resolutionNotes: body.resolutionNotes,
        actorId,
      })

      await logAuditEvent(admin, tenantId, actorId, "receiving.exception.barcode_saved", id, {
        barcodeId: result.barcodeId,
        reposted: result.reposted,
        movementId: result.movementId,
      })

      return NextResponse.json({
        ok: true,
        status: "resolved",
        barcodeId: result.barcodeId,
        reposted: result.reposted,
        movementId: result.movementId ?? null,
      })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    const msg = err instanceof Error ? err.message : "Internal server error"
    // Surface barcode-conflict errors clearly
    if (msg.includes("already registered")) {
      return NextResponse.json({ error: msg }, { status: 409 })
    }
    console.error("[api/receiving/exceptions/[id] PATCH]", err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
