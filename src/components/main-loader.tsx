import { IconFidgetSpinner } from '@tabler/icons-react'
import logoBlack from '@/assets/images/logo-black.svg'
import logoWhite from '@/assets/images/logo.svg'

function MainLoader() {
  return (
    <div
      className={`flex h-screen w-screen flex-col items-center justify-center gap-10`}
    >
      <img
        src={logoBlack}
        alt='commentify'
        className='block min-w-[200px] dark:hidden'
      />
      <img
        src={logoWhite}
        alt='commentify'
        className='hidden min-w-[200px] dark:block'
      />
      <div className='max-w-8'>
        <IconFidgetSpinner className='animate-spin' />
      </div>
    </div>
  )
}

export default MainLoader
