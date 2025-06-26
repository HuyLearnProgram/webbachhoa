import React from 'react'
import { Button } from '@/components'
import { Link } from 'react-router-dom'
import path from '@/utils/path'
import error from '@/assets/error.svg'
const ErrorPage = ({ statusCode = 404 }) => {
  return (
    <div className="w-main min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 flex flex-col lg:flex-row items-center justify-center min-h-screen">
        <div className="w-full lg:w-1/2 mb-8 lg:mb-0">
          <img src={error} alt="" />
        </div>
        <div className="w-full lg:w-1/2 text-center lg:text-left lg:pl-8">
          <h1 className="text-9xl font-bold text-primary mb-4">{statusCode}</h1>
          <h2 className="text-4xl font-bold mb-4"></h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-md mx-auto lg:mx-0">
            It looks like something is missing!
          </p>
          <Button>
            <Link to={`/${path.HOME}`} className="inline-flex items-center space-x-2 hover:underline">
              <span>Return Home</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ErrorPage