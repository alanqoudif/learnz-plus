import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import { firestore, COLLECTIONS } from '../config/firebase';
import { CommunityPost, School, UserProfile, UserRole } from '../types';
import { ensureUserCode } from './schoolService';

const tsToDate = (v: any): Date => (v?.toDate ? v.toDate() : v?.seconds ? new Date(v.seconds * 1000) : v ? new Date(v) : new Date());

function generateInviteCode(length: number = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) code += Math.floor(Math.random() * 10).toString();
  return code;
}

export const communityService = {
  // Create or refresh a school's invite code (leader only)
  async refreshInviteCode(schoolId: string, ttlHours: number = 168): Promise<{ inviteCode: string; inviteExpiresAt: Date }>
  {
    const inviteCode = generateInviteCode(6);
    const expires = new Date(Date.now() + ttlHours * 3600 * 1000);
    const schoolRef = doc(firestore, COLLECTIONS.SCHOOLS, schoolId);
    await updateDoc(schoolRef, {
      inviteCode,
      inviteExpiresAt: Timestamp.fromDate(expires)
    });
    return { inviteCode, inviteExpiresAt: expires } as any;
  },

  // Subscribe to school's community messages (latest first)
  subscribeToCommunity(schoolId: string, onData: (posts: CommunityPost[]) => void) {
    const qRef = query(
      collection(firestore, `${COLLECTIONS.SCHOOLS}/${schoolId}/community`),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const unsub = onSnapshot(qRef, (snap) => {
      const items: CommunityPost[] = [] as any;
      snap.forEach((docSnap) => {
        const d: any = docSnap.data();
        items.push({
          id: docSnap.id,
          schoolId,
          type: d.type || 'announcement',
          title: d.title || '',
          body: d.body || '',
          authorId: d.authorId || '',
          createdAt: tsToDate(d.createdAt),
        });
      });
      onData(items);
    });
    return { unsubscribe: unsub };
  },

  // Create announcement post
  async createAnnouncementPost(
    schoolId: string,
    authorId: string,
    payload: { title: string; body: string }
  ): Promise<CommunityPost> {
    const col = collection(firestore, `${COLLECTIONS.SCHOOLS}/${schoolId}/community`);
    const ref = await addDoc(col, {
      type: 'announcement',
      title: payload.title,
      body: payload.body,
      authorId,
      createdAt: serverTimestamp(),
    });
    const snap = await getDoc(ref);
    const data = snap.data() as any;
    return {
      id: ref.id,
      schoolId,
      type: 'announcement',
      title: data?.title || payload.title,
      body: data?.body || payload.body,
      authorId,
      createdAt: tsToDate(data?.createdAt),
    };
  },

  // Join school by invite code
  async joinSchoolByCode(userId: string, code: string): Promise<School>
  {
    const q = query(collection(firestore, COLLECTIONS.SCHOOLS), where('inviteCode', '==', code.toUpperCase()));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error('رمز الدعوة غير صحيح');
    const schoolDoc = snap.docs[0];
    const data = schoolDoc.data();
    const exp = tsToDate(data.inviteExpiresAt);
    if (exp && exp.getTime() < Date.now()) throw new Error('انتهت صلاحية رمز الدعوة');

    // set membership in users/{uid}
    const userRef = doc(firestore, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      schoolId: schoolDoc.id,
      role: 'member'
    });
    await ensureUserCode(userId, { schoolId: schoolDoc.id, schoolName: data.name });

    return {
      id: schoolDoc.id,
      name: data.name,
      leaderUserId: data.leaderUserId,
      inviteCode: data.inviteCode,
      inviteExpiresAt: exp,
    };
  },

  // Create school (initial leader setup)
  async createSchool(name: string, leaderUserId: string): Promise<School>
  {
    const inviteCode = generateInviteCode(6);
    const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    const docRef = await addDoc(collection(firestore, COLLECTIONS.SCHOOLS), {
      name,
      leaderUserId,
      inviteCode,
      inviteExpiresAt: Timestamp.fromDate(expires),
      createdAt: serverTimestamp(),
    });

    // update user profile
    await setDoc(doc(firestore, COLLECTIONS.USERS, leaderUserId), {
      schoolId: docRef.id,
      role: 'leader'
    }, { merge: true });
    await ensureUserCode(leaderUserId, { schoolId: docRef.id, schoolName: name });

    return {
      id: docRef.id,
      name,
      leaderUserId,
      inviteCode,
      inviteExpiresAt: expires,
    };
  },

  // Create absence post in the school community
  async createAbsencePost(schoolId: string, authorId: string, payload: { title: string; body: string }): Promise<CommunityPost>
  {
    const col = collection(firestore, `${COLLECTIONS.SCHOOLS}/${schoolId}/community`);
    const ref = await addDoc(col, {
      type: 'attendance',
      title: payload.title,
      body: payload.body,
      authorId,
      createdAt: serverTimestamp(),
    });
    const snap = await getDoc(ref);
    const data = snap.data() as any;
    return {
      id: ref.id,
      schoolId,
      type: 'attendance',
      title: data?.title || payload.title,
      body: data?.body || payload.body,
      authorId,
      createdAt: tsToDate(data?.createdAt),
    };
  },
};

