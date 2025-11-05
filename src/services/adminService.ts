import { httpsCallable } from 'firebase/functions';
import { cloudFunctions } from '../config/firebase';

export interface CreateTeacherInput {
  email: string;
  name: string;
  role?: 'member' | 'leader';
}

export interface CreateTeacherResult {
  userId: string;
  email: string;
  password: string; // temporary
}

export const adminService = {
  async createTeacherAccount(payload: CreateTeacherInput): Promise<CreateTeacherResult> {
    const fn = httpsCallable(cloudFunctions, 'createTeacherAccount');
    const res: any = await fn(payload);
    return res.data as CreateTeacherResult;
  },

  async resetTeacherPassword(userId: string): Promise<{ password: string }> {
    const fn = httpsCallable(cloudFunctions, 'resetTeacherPassword');
    const res: any = await fn({ userId });
    return res.data as { password: string };
  },

  async setTeacherDisabled(userId: string, disabled: boolean): Promise<void> {
    const fn = httpsCallable(cloudFunctions, 'setTeacherDisabled');
    await fn({ userId, disabled });
  }
};
