import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compareSync } from "bcryptjs";
import { prisma } from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Nom d'utilisateur" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username as string;
        const password = credentials?.password as string;
        if (!username || !password) return null;

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) return null;
        if (!compareSync(password, user.passwordHash)) return null;

        return {
          id: user.id,
          name: user.displayName,
          email: user.username,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const uid = user?.id ?? (token.userId as string | undefined) ?? token.sub;
      if (uid) {
        token.userId = uid;
        const dbUser = await prisma.user.findUnique({
          where: { id: uid },
          include: { clan: { select: { slug: true, name: true } } },
        });
        if (dbUser) {
          token.publicId = dbUser.publicId;
          token.hubRole = dbUser.hubRole;
          token.role = dbUser.role;
          token.clanId = dbUser.clanId ?? null;
          token.clanSlug = dbUser.clan?.slug ?? null;
          token.grade = dbUser.grade;
          token.specialization = dbUser.specialization;
          token.permissionLevel = dbUser.permissionLevel;
          token.mustChangePassword = dbUser.mustChangePassword;
          token.anonymous = dbUser.anonymous;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId || token.sub) as string;
        const s = session as unknown as Record<string, unknown>;
        s.publicId = token.publicId;
        s.hubRole = token.hubRole;
        s.role = token.role;
        s.clanId = token.clanId;
        s.clanSlug = token.clanSlug;
        s.grade = token.grade;
        s.specialization = token.specialization;
        s.permissionLevel = token.permissionLevel;
        s.mustChangePassword = token.mustChangePassword;
        s.anonymous = token.anonymous;
      }
      return session;
    },
  },
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});
