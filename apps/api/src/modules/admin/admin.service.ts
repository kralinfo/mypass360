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

  getEventAttendees(eventId: string) {
    return this.adminRepository.getEventAttendees(eventId)
  }

  getEventDetails(eventId: string) {
    return this.adminRepository.getEventDetails(eventId)
  }

  getCheckinAccesses(eventId: string) {
    return this.adminRepository.getCheckinAccesses(eventId)
  }

  createCheckinAccess(eventId: string, name: string) {
    return this.adminRepository.createCheckinAccess(eventId, name)
  }

  updateCheckinAccess(accessId: string, data: { name?: string; isActive?: boolean }) {
    return this.adminRepository.updateCheckinAccess(accessId, data)
  }

  deleteCheckinAccess(accessId: string) {
    return this.adminRepository.deleteCheckinAccess(accessId)
  }

  getEventCheckins(eventId: string) {
    return this.adminRepository.getEventCheckins(eventId)
  }

  resetEventCheckins(eventId: string) {
    return this.adminRepository.resetEventCheckins(eventId)
  }

  updateEventCheckinStatus(eventId: string, enabled: boolean) {
    return this.adminRepository.updateEventCheckinStatus(eventId, enabled)
  }

  deleteEventCheckin(eventId: string, checkinId: string) {
    return this.adminRepository.deleteEventCheckin(eventId, checkinId)
  }
}


