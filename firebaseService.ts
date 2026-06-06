import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  docFromServer,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';

export interface FirebaseConversation {
  id: string;
  userId: string;
  topic: string;
  createdAt: string;
  lastMessageAt: string;
}

export interface FirebaseMessage {
  id: string;
  conversationId: string;
  userId: string;
  sender: 'user' | 'model';
  text: string;
  timestamp: string;
  groundingSources?: any[];
}

export interface FirebaseBooking {
  id: string;
  userId: string;
  clinicId: string;
  clinicName: string;
  patientName: string;
  contactPhone: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
  createdAt: string;
}

/**
 * Validate connection to Firestore. Required during boot.
 */
export async function testConnection() {
  try {
    const testDoc = doc(db, 'test', 'connection');
    await getDocFromServer(testDoc);
    console.log("Firebase Connection Verified successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration: Client appears to be offline.");
    } else {
      console.log("Ignored expected clean connection test result");
    }
  }
}

/**
 * Conversations DB Store
 */
export async function createOrUpdateConversation(conversationId: string, topic: string) {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error("Authentication required");

  const path = `conversations/${conversationId}`;
  try {
    const docRef = doc(db, 'conversations', conversationId);
    const existing = await getDoc(docRef);
    const now = new Date().toISOString();

    const convoData: FirebaseConversation = {
      id: conversationId,
      userId,
      topic,
      createdAt: existing.exists() ? existing.data()?.createdAt || now : now,
      lastMessageAt: now,
    };

    await setDoc(docRef, convoData);
    return convoData;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchUserConversations(): Promise<FirebaseConversation[]> {
  const userId = auth.currentUser?.uid;
  if (!userId) return [];

  const path = 'conversations';
  try {
    const q = query(
      collection(db, 'conversations'), 
      where('userId', '==', userId),
      orderBy('lastMessageAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as FirebaseConversation);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Messages DB Store
 */
export async function saveMessageToDb(conversationId: string, messageId: string, sender: 'user' | 'model', text: string, groundingSources?: any[]) {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error("Authentication required");

  const path = `conversations/${conversationId}/messages/${messageId}`;
  try {
    const msgData: FirebaseMessage = {
      id: messageId,
      conversationId,
      userId,
      sender,
      text,
      timestamp: new Date().toISOString(),
      ...(groundingSources ? { groundingSources } : {})
    };

    const docRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await setDoc(docRef, msgData);

    // Synchronously update the last message timeline in parent conversation
    const parentRef = doc(db, 'conversations', conversationId);
    const parentDoc = await getDoc(parentRef);
    if (parentDoc.exists()) {
      await setDoc(parentRef, {
        ...parentDoc.data(),
        lastMessageAt: msgData.timestamp
      });
    }

    return msgData;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchConversationMessages(conversationId: string): Promise<FirebaseMessage[]> {
  const userId = auth.currentUser?.uid;
  if (!userId) return [];

  const path = `conversations/${conversationId}/messages`;
  try {
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as FirebaseMessage);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Booking Requests DB Store
 */
export async function createBookingRequest(
  clinicId: string, 
  clinicName: string, 
  patientName: string, 
  contactPhone: string, 
  date: string, 
  time: string, 
  notes?: string
): Promise<FirebaseBooking> {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error("Authentication required to make a booking");

  const bookingId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5);
  const path = `booking_requests/${bookingId}`;
  try {
    const booking: FirebaseBooking = {
      id: bookingId,
      userId,
      clinicId,
      clinicName,
      patientName,
      contactPhone,
      date,
      time,
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...(notes ? { notes } : {})
    };

    await setDoc(doc(db, 'booking_requests', bookingId), booking);
    return booking;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function fetchUserBookings(): Promise<FirebaseBooking[]> {
  const userId = auth.currentUser?.uid;
  if (!userId) return [];

  const path = 'booking_requests';
  try {
    const q = query(
      collection(db, 'booking_requests'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as FirebaseBooking);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function cancelBookingRequest(bookingId: string) {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error("Authentication required");

  const path = `booking_requests/${bookingId}`;
  try {
    const docRef = doc(db, 'booking_requests', bookingId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) throw new Error("Booking request not found");
    
    const currData = snapshot.data() as FirebaseBooking;
    if (currData.userId !== userId) throw new Error("Permission denied. Not the owner.");

    const updated: FirebaseBooking = {
      ...currData,
      status: 'cancelled'
    };

    await setDoc(docRef, updated);
    return updated;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}
