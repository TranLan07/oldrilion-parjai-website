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
      // First sign-in: populate token from DB
      if (user?.id) {
        token.userId = user.id;
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (dbUser) {
          token.role = dbUser.role;
          token.grade = dbUser.grade;
          token.specialization = dbUser.specialization;
          token.permissionLevel = dbUser.permissionLevel;
          token.mustChangePassword = dbUser.mustChangePassword;
        }
      }
      // Ensure userId is always set (fallback to sub which NextAuth sets to user.id)
      if (!token.userId && token.sub) {
        token.userId = token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId || token.sub) as string;
        (session as unknown as Record<string, unknown>).role = token.role;
        (session as unknown as Record<string, unknown>).grade = token.grade;
        (session as unknown as Record<string, unknown>).specialization = token.specialization;
        (session as unknown as Record<string, unknown>).permissionLevel = token.permissionLevel;
        (session as unknown as Record<string, unknown>).mustChangePassword = token.mustChangePassword;
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
