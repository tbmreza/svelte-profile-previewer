export function objectCopy(obj) {
  if (typeof obj === "object") {
    return JSON.parse(JSON.stringify(obj));
  } else {
    console.log(obj);
  }
}
export function findObjectInArrayById(list, objectId) {
  return list.find((x) => x.id === objectId);
}
export function inputDateFormat(newDateString) {
  // unused
  if (/\d{4}-\d{1,2}-\d{1,2}/.test(newDateString)) {
    return newDateString.slice(0, 10);
  } else {
    console.log(newDateString);
  }
}
export function schemaString(objectList) {
  // unused
  let _ = [];
  for (const i in objectList) {
    _.push(i);
  }
  return JSON.stringify(_);
}
