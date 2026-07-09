import { v4 as uuidv4 } from 'uuid'

// Session id ẩn danh cho event tracking (hệ thống gợi ý AI):
// nhận diện hành vi của khách CHƯA đăng nhập, backend sẽ merge vào user thật khi login
// qua POST events/session-merge. Không liên quan tới JWT/phiên đăng nhập.
const SESSION_ID_KEY = 'ogani_tracking_session_id'

export const getOrCreateSessionId = () => {
    try {
        let sessionId = localStorage.getItem(SESSION_ID_KEY)
        if (!sessionId) {
            sessionId = uuidv4()
            localStorage.setItem(SESSION_ID_KEY, sessionId)
        }
        return sessionId
    } catch {
        // localStorage bị chặn (private mode…) — tracking ẩn danh coi như tắt, không làm vỡ app
        return null
    }
}
