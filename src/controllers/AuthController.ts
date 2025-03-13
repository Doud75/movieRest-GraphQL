import { ApiError } from "@error/ApiError";
import { ErrorCode } from "@error/ErrorCodes";
import { IUserRO } from "@model/types/IUser";
import { ORM } from "@orm/ORM";
import { Body, Get, Post, Query, Route } from 'tsoa';
import { IAccessToken } from "utility/auth/IAccessToken";
import { Emailer } from "utility/email/Emailer";
import { JWT } from "utility/JWT/JWT";
import { JWT_ACCESS_AUD, JWT_EMAIL_LINK_AUD, JWT_ISSUER } from "utility/JWT/JWTConstants";

@Route("/auth")
export class AuthController {
  
  @Post("/login")
  public async sendMagicLink(  
    @Body() body: { email: string }
  ): Promise<{ ok: boolean }> {    
    // Vérifier si un utilisateur existe avec cet email
    const user = await ORM.Read<{ userId: number; email: string; role: string }>({
      table: 'user',
      idKey: 'email',
      idValue: body.email,
      columns: ['userId', 'email', 'role']
    });

    if (!user) {
      throw new ApiError(ErrorCode.NotFound, 'auth/user-not-found', "Aucun utilisateur trouvé avec cet email.");
    }

    // Création du JWT
    const jwt = new JWT();
    const encoded = await jwt.create(
      { userId: user.userId, role: user.role },
      { expiresIn: '30 minutes', audience: JWT_EMAIL_LINK_AUD, issuer: JWT_ISSUER }
    ) as string;
    
    const emailer = new Emailer();
    const link = `${process.env.FRONT_URL || 'http://localhost:5050'}/auth/authorize?jwt=${encodeURIComponent(encoded)}`;
    
    await emailer.sendMagicLink(user.email, link, 'Mon service');

    return { ok: true };
  }

  @Get("/authorize")
  public async authorizeFromLink(@Query() jwt: string): Promise<{ 
    access: string;
    redirectTo: string;
    message: string;
  }> {    
    const helper = new JWT();
    const decoded = await helper.decodeAndVerify(jwt, {
      issuer: JWT_ISSUER,
      audience: JWT_EMAIL_LINK_AUD,
    });

    if (!decoded.userId) {
      throw new ApiError(ErrorCode.Unauthorized, 'auth/invalid-authorize-link-token', "userId absent dans le token.");
    }

    // Vérifier l'existence de l'utilisateur et récupérer son rôle
    const user = await ORM.Read<{ userId: number; role: string }>({
      table: 'user',
      idKey: 'userId',
      idValue: decoded.userId,
      columns: ['userId', 'role']
    });

    if (!user) {
      throw new ApiError(ErrorCode.NotFound, 'auth/user-not-found', "Utilisateur introuvable.");
    }

    // Générer le token d'accès avec le rôle
    const payload: IAccessToken = {
      userId: user.userId,
      role: user.role
    };

    const access = await helper.create(payload, {
      expiresIn: '12 hours',
      issuer: JWT_ISSUER,
      audience: JWT_ACCESS_AUD,
    }) as string;

    return {
      access,
      redirectTo: 'https://lien.vers.mon.front',
      message: 'Authentification réussie.'
    };
  }
}
