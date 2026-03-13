import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (data: { name: string }) => api.patch('/api/profile', data),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post('/api/password/change', data),
  })
}
