export const DEFAULT_GUEST_NAME = "빡빡이";

export function guestCharacterName(name) {
  return !name || name === "나의 사이타마" ? DEFAULT_GUEST_NAME : name;
}
