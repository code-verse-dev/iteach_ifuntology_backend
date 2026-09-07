export function ApiResponse(data: any = {}, message = '', status = false) {
  return { status, message, data };
}
