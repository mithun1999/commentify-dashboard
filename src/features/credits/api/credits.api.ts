import { axiosInstance } from '@/utils/axios.util'
import { ICredits } from '../interface/credits.interface'

export async function getCredits() {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/credit`,
  })
  return data as ICredits
}
