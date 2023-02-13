export function accountingDisplay(num: number | undefined) {
  if (num === undefined || isNaN(num)) return "N/A";

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    currencySign: "accounting",
  });
  return formatter.format(Math.round(num * 100) / 100 || 0); // ? The or here normalizes -0 to 0;
}

export const normalizedPhoneNumber = (ph: string) => {
  if (!ph) return "N/A";
  return ph
    .split("")
    .filter((c) => "1234567890".indexOf(c) !== -1)
    .join("");
};

export const displayPhoneNumber = (num: string) => {
  var pNum = normalizedPhoneNumber(num);
  if (pNum[0] === "1" && pNum !== "1234567890") pNum = pNum.slice(1);
  if (pNum.length !== 10) return 'invalid number: "' + num + '"';
  return "(" + pNum.slice(0, 3) + ") " + pNum.slice(3, 6) + "-" + pNum.slice(6);
};

export const stripPhone = (phone: string) => {
  return displayPhoneNumber(phone).split(/\W+/).join("");
};

export function sanitizePhone(pNum: string): string {
  const ret = pNum.replace(/\D/g, "");
  return ret[0] === "1" ? ret.slice(1) : ret;
}

export function testEmail(email: string) {
  return email
    .toLowerCase()
    .match(
      /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/
    );
}
