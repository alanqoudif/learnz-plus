import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { firestore, COLLECTIONS } from '../config/firebase';
import { School, UserProfile, UserRole } from '../types';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(length: number = 6) {
  let code = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * CODE_ALPHABET.length);
    code += CODE_ALPHABET[randomIndex];
  }
  return code;
}

async function isCodeUnique(code: string): Promise<boolean> {
  const usersQuery = query(
    collection(firestore, COLLECTIONS.USERS),
    where('userCode', '==', code)
  );
  const snapshot = await getDocs(usersQuery);
  return snapshot.empty;
}

export async function ensureUserCode(userId: string): Promise<string> {
  const userRef = doc(firestore, COLLECTIONS.USERS, userId);
  const userSnap = await getDoc(userRef);
  const existingCode = userSnap.data()?.userCode;
  if (existingCode) return existingCode;

  let newCode = generateCode();
  while (!(await isCodeUnique(newCode))) {
    newCode = generateCode();
  }

  await setDoc(userRef, { userCode: newCode }, { merge: true });
  return newCode;
}

export async function createSchoolForUser(name: string, leaderUserId: string): Promise<School> {
  const inviteCode = generateCode(6);
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);

  const schoolRef = await addDoc(collection(firestore, COLLECTIONS.SCHOOLS), {
    name: name.trim(),
    leaderUserId,
    inviteCode,
    inviteExpiresAt: Timestamp.fromDate(expiresAt),
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(firestore, COLLECTIONS.USERS, leaderUserId), {
    schoolId: schoolRef.id,
    schoolName: name.trim(),
    role: 'leader',
  }, { merge: true });

  return {
    id: schoolRef.id,
    name: name.trim(),
    leaderUserId,
    inviteCode,
    inviteExpiresAt: expiresAt,
  };
}

export async function joinSchoolByTeacherCode(joinerId: string, teacherCode: string): Promise<School> {
  const normalized = teacherCode.trim().toUpperCase();
  if (!normalized) {
    throw new Error('يرجى إدخال رمز صحيح');
  }

  const usersQuery = query(
    collection(firestore, COLLECTIONS.USERS),
    where('userCode', '==', normalized)
  );
  const snapshot = await getDocs(usersQuery);
  if (snapshot.empty) {
    throw new Error('لم يتم العثور على معلم بهذا الرمز');
  }

  const teacherDoc = snapshot.docs[0];
  const teacherData: any = teacherDoc.data();
  if (!teacherData.schoolId) {
    throw new Error('هذا المعلم لم يربط حسابه بمدرسة بعد');
  }

  const schoolRef = doc(firestore, COLLECTIONS.SCHOOLS, teacherData.schoolId);
  const schoolSnap = await getDoc(schoolRef);
  if (!schoolSnap.exists()) {
    throw new Error('لم يتم العثور على المدرسة المرتبطة بهذا المعلم');
  }

  await setDoc(doc(firestore, COLLECTIONS.USERS, joinerId), {
    schoolId: teacherData.schoolId,
    schoolName: teacherData.schoolName || schoolSnap.data()?.name || null,
    role: 'member',
  }, { merge: true });

  const schoolData: any = schoolSnap.data();
  return {
    id: schoolSnap.id,
    name: schoolData.name,
    leaderUserId: schoolData.leaderUserId,
    inviteCode: schoolData.inviteCode,
    inviteExpiresAt: schoolData.inviteExpiresAt?.toDate
      ? schoolData.inviteExpiresAt.toDate()
      : schoolData.inviteExpiresAt
        ? new Date(schoolData.inviteExpiresAt)
        : undefined,
  } as School;
}

export async function updateMemberRole(userId: string, role: UserRole): Promise<void> {
  await updateDoc(doc(firestore, COLLECTIONS.USERS, userId), { role });
}

export async function getSchoolMembers(schoolId: string): Promise<UserProfile[]> {
  const membersQuery = query(
    collection(firestore, COLLECTIONS.USERS),
    where('schoolId', '==', schoolId)
  );
  const snapshot = await getDocs(membersQuery);
  return snapshot.docs.map(docSnap => {
    const data: any = docSnap.data();
    return {
      id: docSnap.id,
      email: data.email,
      name: data.name,
      schoolId: data.schoolId,
      schoolName: data.schoolName,
      role: data.role || 'member',
      tier: data.tier || 'free',
      userCode: data.userCode,
    };
  });
}
