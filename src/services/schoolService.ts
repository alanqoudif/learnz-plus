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
  limit,
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

async function saveTeacherCodeRecord(
  userId: string,
  code: string,
  metadata?: {
    name?: string | null;
    phoneNumber?: string | null;
    schoolId?: string | null;
    schoolName?: string | null;
  }
) {
  const normalizedCode = code.trim().toUpperCase();
  const codeRef = doc(firestore, COLLECTIONS.TEACHER_CODES, userId);
  const existing = await getDoc(codeRef);
  const payload: any = {
    teacherId: userId,
    code: normalizedCode,
    normalizedCode,
    teacherName: metadata?.name ?? null,
    phoneNumber: metadata?.phoneNumber ?? null,
    schoolId: metadata?.schoolId ?? null,
    schoolName: metadata?.schoolName ?? null,
    updatedAt: serverTimestamp(),
  };
  if (!existing.exists()) {
    payload.createdAt = serverTimestamp();
  }
  await setDoc(codeRef, payload, { merge: true });
}

export async function ensureUserCode(
  userId: string,
  metadata?: {
    name?: string | null;
    phoneNumber?: string | null;
    schoolId?: string | null;
    schoolName?: string | null;
  }
): Promise<string> {
  const userRef = doc(firestore, COLLECTIONS.USERS, userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data() || {};
  const resolvedMetadata = {
    name: metadata?.name ?? userData.name ?? null,
    phoneNumber: metadata?.phoneNumber ?? userData.phoneNumber ?? null,
    schoolId: metadata?.schoolId ?? userData.schoolId ?? null,
    schoolName: metadata?.schoolName ?? userData.schoolName ?? null,
  };
  const existingCode = userData?.userCode;
  if (existingCode) {
    await saveTeacherCodeRecord(userId, existingCode, resolvedMetadata);
    return existingCode;
  }

  let newCode = generateCode();
  while (!(await isCodeUnique(newCode))) {
    newCode = generateCode();
  }

  await setDoc(userRef, { userCode: newCode }, { merge: true });
  await saveTeacherCodeRecord(userId, newCode, resolvedMetadata);
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
  await ensureUserCode(leaderUserId, { schoolId: schoolRef.id, schoolName: name.trim() });

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

  let teacherId: string | null = null;
  let teacherCodeData: any = null;

  const codeQuery = query(
    collection(firestore, COLLECTIONS.TEACHER_CODES),
    where('normalizedCode', '==', normalized),
    limit(1)
  );
  const codeSnapshot = await getDocs(codeQuery);
  if (!codeSnapshot.empty) {
    teacherId = codeSnapshot.docs[0].id;
    teacherCodeData = codeSnapshot.docs[0].data();
  } else {
    const usersQuery = query(
      collection(firestore, COLLECTIONS.USERS),
      where('userCode', '==', normalized),
      limit(1)
    );
    const snapshot = await getDocs(usersQuery);
    if (!snapshot.empty) {
      teacherId = snapshot.docs[0].id;
      teacherCodeData = snapshot.docs[0].data();
    }
  }

  if (!teacherId) {
    const schoolQuery = query(
      collection(firestore, COLLECTIONS.SCHOOLS),
      where('inviteCode', '==', normalized),
      limit(1)
    );
    const schoolSnapshot = await getDocs(schoolQuery);
    if (!schoolSnapshot.empty) {
      const schoolDoc = schoolSnapshot.docs[0];
      const schoolData: any = schoolDoc.data();
      const inviteExpiresAt = schoolData.inviteExpiresAt?.toDate
        ? schoolData.inviteExpiresAt.toDate()
        : schoolData.inviteExpiresAt?.seconds
          ? new Date(schoolData.inviteExpiresAt.seconds * 1000)
          : schoolData.inviteExpiresAt
            ? new Date(schoolData.inviteExpiresAt)
            : null;
      if (inviteExpiresAt && inviteExpiresAt.getTime() < Date.now()) {
        throw new Error('انتهت صلاحية رمز المدرسة، اطلب من قائدك رمزاً محدثاً.');
      }

      await setDoc(doc(firestore, COLLECTIONS.USERS, joinerId), {
        schoolId: schoolDoc.id,
        schoolName: schoolData.name,
        role: 'member',
      }, { merge: true });
      await ensureUserCode(joinerId, {
        schoolId: schoolDoc.id,
        schoolName: schoolData.name,
      });

      return {
        id: schoolDoc.id,
        name: schoolData.name,
        leaderUserId: schoolData.leaderUserId,
        inviteCode: schoolData.inviteCode,
        inviteExpiresAt,
      };
    }

    throw new Error('لم يتم العثور على معلم أو مدرسة بهذا الرمز');
  }

  const teacherRef = doc(firestore, COLLECTIONS.USERS, teacherId);
  const teacherSnap = await getDoc(teacherRef);
  const teacherData: any = teacherSnap.exists() ? teacherSnap.data() : {};
  const teacherSchoolId = teacherCodeData?.schoolId || teacherData?.schoolId;

  if (!teacherSchoolId) {
    throw new Error('هذا المعلم لم يربط حسابه بمدرسة بعد');
  }

  const schoolRef = doc(firestore, COLLECTIONS.SCHOOLS, teacherSchoolId);
  const schoolSnap = await getDoc(schoolRef);
  if (!schoolSnap.exists()) {
    throw new Error('لم يتم العثور على المدرسة المرتبطة بهذا المعلم');
  }

  const schoolName = teacherCodeData?.schoolName || teacherData?.schoolName || schoolSnap.data()?.name || null;

  await setDoc(doc(firestore, COLLECTIONS.USERS, joinerId), {
    schoolId: teacherSchoolId,
    schoolName,
    role: 'member',
  }, { merge: true });
  await ensureUserCode(teacherId, {
    name: teacherData?.name ?? teacherCodeData?.teacherName ?? null,
    phoneNumber: teacherData?.phoneNumber ?? teacherCodeData?.phoneNumber ?? null,
    schoolId: teacherSchoolId,
    schoolName,
  });
  await ensureUserCode(joinerId, {
    schoolId: teacherSchoolId,
    schoolName,
  });

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
  const codesSnapshot = await getDocs(
    query(
      collection(firestore, COLLECTIONS.TEACHER_CODES),
      where('schoolId', '==', schoolId)
    )
  );
  const codesMap = new Map<string, string>();
  codesSnapshot.forEach(docSnap => {
    const data: any = docSnap.data();
    if (data?.code) {
      codesMap.set(docSnap.id, data.code);
    }
  });
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
      userCode: data.userCode || codesMap.get(docSnap.id),
    };
  });
}

export async function leaveSchool(userId: string): Promise<void> {
  if (!userId) {
    throw new Error('يجب تسجيل الدخول قبل مغادرة المدرسة');
  }

  const userRef = doc(firestore, COLLECTIONS.USERS, userId);
  await updateDoc(userRef, {
    schoolId: null,
    schoolName: null,
    role: 'member',
  });

  const teacherCodeRef = doc(firestore, COLLECTIONS.TEACHER_CODES, userId);
  await setDoc(teacherCodeRef, {
    schoolId: null,
    schoolName: null,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getSchoolById(schoolId: string): Promise<School | null> {
  const ref = doc(firestore, COLLECTIONS.SCHOOLS, schoolId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return null;
  }
  const data: any = snap.data();
  return {
    id: snap.id,
    name: data?.name,
    leaderUserId: data?.leaderUserId,
    inviteCode: data?.inviteCode,
    inviteExpiresAt: data?.inviteExpiresAt?.toDate
      ? data.inviteExpiresAt.toDate()
      : data?.inviteExpiresAt?.seconds
        ? new Date(data.inviteExpiresAt.seconds * 1000)
        : data?.inviteExpiresAt
          ? new Date(data.inviteExpiresAt)
          : undefined,
  };
}
