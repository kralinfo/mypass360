import { Injectable } from '@nestjs/common'
import { AdminRepository } from './admin.repository'

@Injectable()
export class AdminService {
  constructor(private readonly adminRepository: AdminRepository) {}

  getDashboard() {
    return this.adminRepository.getDashboard()
  }

  updateUserStatus(userId: string, disabled: boolean) {
    return this.adminRepository.updateUserStatus(userId, disabled)
  }

  deleteUser(userId: string) {
    return this.adminRepository.deleteUser(userId)
  }

  updateEventStatus(eventId: string, status: 'draft' | 'published' | 'cancelled' | 'finished') {
    return this.adminRepository.updateEventStatus(eventId, status)
  }

  deleteEvent(eventId: string) {
    return this.adminRepository.deleteEvent(eventId)
  }

  remindPendingOrders(eventId: string) {
    return this.adminRepository.remindPendingOrders(eventId)
  }
}