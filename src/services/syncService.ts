import { smartAttendanceService as attendanceService } from './smartService';
import { AttendanceRecord, AttendanceSession } from '../types';
import { offlineStorage, PendingAction } from './offlineStorage';

interface SyncResult {
  processed: number;
  failed: number;
}

interface CreateSessionPayload {
  tempId: string;
  session: Omit<AttendanceSession, 'id' | 'createdAt' | 'records'> & { createdAt: Date };
}

interface RecordPayload {
  tempId: string;
  sessionId: string;
  record: Omit<AttendanceRecord, 'id' | 'createdAt'> & { createdAt: Date };
}

const isCreateSession = (action: PendingAction): action is PendingAction<CreateSessionPayload> => action.type === 'CREATE_SESSION';
const isRecordAttendance = (action: PendingAction): action is PendingAction<RecordPayload> => action.type === 'RECORD_ATTENDANCE';

export async function syncPendingAttendance(): Promise<SyncResult> {
  const actions = await offlineStorage.getPendingActions();
  if (!actions.length) {
    return { processed: 0, failed: 0 };
  }

  const sorted = [...actions].sort((a, b) => a.createdAt - b.createdAt);
  const remaining: PendingAction[] = [];
  const sessionIdMap = new Map<string, string>();
  let processed = 0;
  let failed = 0;

  for (const action of sorted) {
    try {
      if (isCreateSession(action)) {
        const payload = action.payload;
        const created = await attendanceService.createAttendanceSession({
          classId: payload.session.classId,
          date: payload.session.date,
        });
        sessionIdMap.set(payload.tempId, created.id);
        await offlineStorage.replaceSessionId(payload.tempId, created);
        processed += 1;
        await offlineStorage.clearPendingAction(action.id);
      } else if (isRecordAttendance(action)) {
        const payload = action.payload;
        const resolvedSessionId = sessionIdMap.get(payload.sessionId) || payload.sessionId;
        const created = await attendanceService.recordAttendance({
          ...payload.record,
          sessionId: resolvedSessionId,
        });
        await offlineStorage.updateRecord(resolvedSessionId, created);
        processed += 1;
        await offlineStorage.clearPendingAction(action.id);
      } else {
        remaining.push(action);
      }
    } catch (error) {
      console.warn('Failed to process pending action', action.type, error);
      failed += 1;
      remaining.push(action);
    }
  }

  if (failed !== actions.length) {
    await offlineStorage.replacePendingActions(remaining);
  }

  return { processed, failed };
}
