import 'server-only';

function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date
    : null;
}

export function ageAtDate(dateString: string, birthDateString = process.env.BIRTH_DATE): number | null {
  if (!birthDateString) return null;

  const date = parseDateOnly(dateString);
  const birthDate = parseDateOnly(birthDateString);
  if (!date || !birthDate || date < birthDate) return null;

  let age = date.getUTCFullYear() - birthDate.getUTCFullYear();
  const birthdayHasPassed =
    date.getUTCMonth() > birthDate.getUTCMonth() ||
    (date.getUTCMonth() === birthDate.getUTCMonth() && date.getUTCDate() >= birthDate.getUTCDate());

  if (!birthdayHasPassed) age -= 1;
  return age;
}
