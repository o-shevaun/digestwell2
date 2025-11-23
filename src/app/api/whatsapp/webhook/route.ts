/**
 * Alias shim so old callbacks to /api/whatsapp/webhook
 * are handled by the real handler at /api/wa/webhook.
 *
 * Nothing else to change — Meta can call either path now.
 */
export { GET, POST } from "../../wa/webhook/route";
