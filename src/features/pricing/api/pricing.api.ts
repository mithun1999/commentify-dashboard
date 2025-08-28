import { axiosInstance } from '@/utils/axios.util'
import { IProduct, ITransactionPayload } from '../interfaces/price.interface'

export async function createTransaction(payload: ITransactionPayload) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/transaction`,
    data: payload,
  })
  return data
}

export async function checkIsLifetimeActivated() {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/transaction/check`,
  })
  return data
}

export async function getPlans() {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/product/list`,
  })
  return data as IProduct[]
}
