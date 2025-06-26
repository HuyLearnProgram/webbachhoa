import React, {memo} from 'react'

const ProductExtraInfoItem = ({icon, title, sub}) => {
  return (
    <div className='flex items-center p-2 gap-4 mb-2 border'>
      <span className='p-2 bg-main rounded-full text-white'>{icon}</span>
      <div className='flex flex-col text-sm text-gray-600'>
        <span className='font-semibold'>{title}</span>
        <span>{sub}</span>
      </div>
    </div>
  )
}

export default memo(ProductExtraInfoItem)