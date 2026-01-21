import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { config } from '../config/index.js';
import { getDatabase, saveDatabase } from '../config/database.js';

export const verifyAndEnableMfa = async (req: Request, res: Response) => {
  try {
    const { secret, token } = req.body;
    console.log('Verifying MFA:', { secretLength: secret?.length, token });

    if (!secret || !token) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1 // Allow 1 step window (30s)
    });

    console.log('MFA Verification Result:', verified);

    if (!verified) {
      return res.status(401).json({ success: false, message: '验证码错误' });
    }

    // Save secret to database
    const db = getDatabase();
    try {
      db.run(`INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`, 
        ['admin_mfa_secret', secret]);
      saveDatabase();
      console.log('MFA secret saved to database');
    } catch (dbError) {
      console.error('Database error saving MFA secret:', dbError);
      return res.status(500).json({ success: false, message: '保存配置失败' });
    }

    return res.json({ success: true, message: 'MFA已验证并开启' });
  } catch (error) {
    console.error('Verify MFA error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { username, password, mfaToken } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    const db = getDatabase();
    
    const pwdResult = db.exec(`SELECT value FROM system_settings WHERE key = 'admin_password'`);
    const changedResult = db.exec(`SELECT value FROM system_settings WHERE key = 'admin_password_changed'`);
    
    const dbAdminPassword = pwdResult.length > 0 && pwdResult[0].values.length > 0 
      ? pwdResult[0].values[0][0] as string 
      : config.admin.password;
      
    const isPasswordChanged = changedResult.length > 0 && changedResult[0].values.length > 0 
      ? changedResult[0].values[0][0] === '1' 
      : false;

    if (username === config.admin.username && password === dbAdminPassword) {
      // Check MFA from DB first, then config
      let mfaSecret = '';
      
      try {
        const result = db.exec(`SELECT value FROM system_settings WHERE key = 'admin_mfa_secret'`);
        if (result.length > 0 && result[0].values.length > 0) {
          mfaSecret = result[0].values[0][0] as string;
          console.log('Found MFA secret in DB');
        }
      } catch (e) {
        console.warn('Could not read system_settings (table might not exist yet):', e);
      }

      if (!mfaSecret) {
        mfaSecret = config.admin.mfaSecret;
        if (mfaSecret) console.log('Using MFA secret from config');
      }

      if (mfaSecret) {
        if (!mfaToken) {
          return res.status(403).json({ success: false, message: '需要MFA验证', requireMfa: true });
        }

        const verified = speakeasy.totp.verify({
          secret: mfaSecret,
          encoding: 'base32',
          token: mfaToken,
          window: 1
        });

        if (!verified) {
          return res.status(401).json({ success: false, message: 'MFA验证码错误' });
        }
      }

      const token = jwt.sign(
        { id: 0, username: config.admin.username, isAdmin: true },
        config.jwt.secret as jwt.Secret,
        { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
      );

      return res.json({
        success: true,
        message: '登录成功',
        data: { 
          token, 
          username: config.admin.username, 
          isAdmin: true,
          mustChangePassword: !isPasswordChanged
        },
      });
    }

    return res.status(401).json({ success: false, message: '用户名或密码错误' });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const changeAdminPassword = async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: '旧密码和新密码不能为空' });
    }

    const db = getDatabase();
    const pwdResult = db.exec(`SELECT value FROM system_settings WHERE key = 'admin_password'`);
    const dbAdminPassword = pwdResult.length > 0 && pwdResult[0].values.length > 0 
      ? pwdResult[0].values[0][0] as string 
      : config.admin.password;

    if (oldPassword !== dbAdminPassword) {
      return res.status(400).json({ success: false, message: '旧密码错误' });
    }

    db.run(`UPDATE system_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'admin_password'`, [newPassword]);
    db.run(`UPDATE system_settings SET value = '1', updated_at = CURRENT_TIMESTAMP WHERE key = 'admin_password_changed'`);
    saveDatabase();

    return res.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    console.error('Change admin password error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const setupMfa = async (req: Request, res: Response) => {
  try {
    console.log('Starting MFA setup...');
    const secret = speakeasy.generateSecret({
      name: `MyGamesV2 Admin (${config.admin.username})`,
    });
    console.log('Secret generated');

    if (!secret.otpauth_url) {
      throw new Error('Failed to generate OTPAuth URL');
    }

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
    console.log('QR Code generated');

    return res.json({
      success: true,
      message: 'MFA配置生成成功',
      data: {
        secret: secret.base32,
        qrCodeUrl,
      },
    });
  } catch (error) {
    console.error('MFA setup error details:', error);
    return res.status(500).json({ 
      success: false, 
      message: '服务器内部错误: ' + (error instanceof Error ? error.message : String(error)) 
    });
  }
};

export const userRegister = async (req: Request, res: Response) => {
  try {
    const { username, password, email, inviteCode } = req.body;

    if (!username || !password || !email || !inviteCode) {
      return res.status(400).json({ success: false, message: '用户名、密码、邮箱和邀请码不能为空' });
    }

    const db = getDatabase();

    const inviteCodeResult = db.exec(`SELECT id FROM invite_codes WHERE code = '${inviteCode}' AND is_used = 0`);
    if (inviteCodeResult.length === 0 || inviteCodeResult[0].values.length === 0) {
      return res.status(400).json({ success: false, message: '无效或已使用的邀请码' });
    }
    const inviteCodeId = inviteCodeResult[0].values[0][0];

    const existingUser = db.exec(`SELECT id FROM users WHERE username = '${username}'`);
    if (existingUser.length > 0 && existingUser[0].values.length > 0) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }

    const existingEmail = db.exec(`SELECT id FROM users WHERE email = '${email}'`);
    if (existingEmail.length > 0 && existingEmail[0].values.length > 0) {
      return res.status(400).json({ success: false, message: '邮箱已被注册' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(`INSERT INTO users (username, password, email, auto_save) VALUES (?, ?, ?, ?)`, 
      [username, hashedPassword, email, 1]);
    
    const newUserResult = db.exec(`SELECT id FROM users WHERE username = '${username}'`);
    const newUserId = newUserResult[0].values[0][0];

    db.run(`UPDATE invite_codes SET is_used = 1, used_by_user_id = ?, used_at = CURRENT_TIMESTAMP WHERE id = ?`, 
      [newUserId, inviteCodeId]);

    saveDatabase();

    return res.json({ success: true, message: '注册成功，请登录' });
  } catch (error) {
    console.error('User register error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const userLogin = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    const db = getDatabase();
    const result = db.exec(`SELECT id, username, password FROM users WHERE username = '${username}'`);

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const user = {
      id: result[0].values[0][0] as number,
      username: result[0].values[0][1] as string,
      password: result[0].values[0][2] as string,
    };

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, isAdmin: false },
      config.jwt.secret as jwt.Secret,
      { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
    );

    return res.json({
      success: true,
      message: '登录成功',
      data: { token, username: user.username },
    });
  } catch (error) {
    console.error('User login error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};
