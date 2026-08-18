import { io } from 'socket.io-client'
import { getToken } from './http'

export function connectChatSocket() {
  return io({ auth: (cb) => cb({ token: getToken() }) })
}
