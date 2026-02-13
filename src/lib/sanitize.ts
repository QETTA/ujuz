const scriptTagPattern = /<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi;
const onEventHandlerPattern = /\s+on[a-z]+\s*=\s*(['"]).*?\1/gi;
const javascriptHrefPattern = /\s+(src|href)\s*=\s*(['"])\s*javascript:[^'"]*?\2/gi;
const htmlTagPattern = /<[^>]*>/g;

export function stripDangerousHtml(value: string): string {
  return value
    .replace(scriptTagPattern, '')
    .replace(onEventHandlerPattern, '')
    .replace(javascriptHrefPattern, '')
    .replace(htmlTagPattern, '')
    .trim();
}

function maskPhones(value: string): string {
  return value.replace(/\b01[016789][ -]?\d{3,4}[ -]?\d{4}\b/g, '***-****-****');
}

function maskEmails(value: string): string {
  return value.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '***@***.***');
}

function maskKakaoIds(value: string): string {
  return value.replace(/(카카오(?:톡|채널)?(?:\s*아이디|\s*ID)?\s*[:=]?\s*)([0-9a-zA-Z_.-]{4,24})/gi, '$1***');
}

function maskKoreanAddresses(value: string): string {
  return value.replace(/\d{1,3}[가-힣]{0,6}(?:동|로|길)\s*\d+[가-힣0-9-]*/g, '주소***');
}

export function maskPII(value: string): string {
  return [maskPhones, maskEmails, maskKakaoIds, maskKoreanAddresses].reduce(
    (acc, fn) => fn(acc),
    value,
  );
}

export function sanitizeCommunityContent(value: string): string {
  return maskPII(stripDangerousHtml(value));
}
