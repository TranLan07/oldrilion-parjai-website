import { prisma } from "./prisma";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export async function generatePublicId(): Promise<string> {
  let id: string;
  do {
    id = Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * 26)]).join("");
  } while (await prisma.user.findUnique({ where: { publicId: id } }));
  return id;
}
