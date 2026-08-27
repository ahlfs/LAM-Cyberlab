import React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  File01Icon,
  Folder01Icon,
  Image01Icon,
  Pdf01Icon,
  Doc01Icon,
  Csv01Icon,
  Ppt01Icon,
  Xls01Icon,
  Zip01Icon,
  Video01Icon,
  AudioWave01Icon,
  TextIcon,
  HtmlFiveIcon,
  DocumentCodeIcon
} from '@hugeicons/core-free-icons'
import { getFileIconClass } from '@/lib/file-icons'
import { cn } from '@/lib/utils'

interface FileIconProps {
  name: string
  type?: 'file' | 'folder'
  size?: number
  className?: string
}

export function FileIcon({ name, type = 'file', size = 20, className }: FileIconProps) {
  if (type === 'folder') {
    return (
      <HugeiconsIcon
        icon={Folder01Icon}
        size={size}
        strokeWidth={1.5}
        className={cn('text-primary-400 dark:text-neutral-500', className)}
      />
    )
  }

  const lower = name.toLowerCase()
  const ext = lower.includes('.') ? lower.slice(lower.lastIndexOf('.') + 1) : ''

  // 1. Check for specific document/media types in Hugeicons first
  let HugeIconType = null
  let iconColorClass = 'text-primary-400 dark:text-neutral-500'
  
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp'].includes(ext)) {
    HugeIconType = Image01Icon
    iconColorClass = 'text-indigo-500'
  } else if (['pdf'].includes(ext)) {
    HugeIconType = Pdf01Icon
    iconColorClass = 'text-red-500'
  } else if (['doc', 'docx'].includes(ext)) {
    HugeIconType = Doc01Icon
    iconColorClass = 'text-blue-500'
  } else if (['xls', 'xlsx'].includes(ext)) {
    HugeIconType = Xls01Icon
    iconColorClass = 'text-emerald-500'
  } else if (['csv'].includes(ext)) {
    HugeIconType = Csv01Icon
    iconColorClass = 'text-emerald-500'
  } else if (['ppt', 'pptx'].includes(ext)) {
    HugeIconType = Ppt01Icon
    iconColorClass = 'text-orange-500'
  } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    HugeIconType = Zip01Icon
    iconColorClass = 'text-amber-500'
  } else if (['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)) {
    HugeIconType = Video01Icon
    iconColorClass = 'text-purple-500'
  } else if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) {
    HugeIconType = AudioWave01Icon
    iconColorClass = 'text-cyan-500'
  } else if (['txt', 'log'].includes(ext)) {
    HugeIconType = TextIcon
    iconColorClass = 'text-slate-500 dark:text-slate-400'
  }

  // 2. Fall back to Devicons for programming languages
  const devIconClass = getFileIconClass(name)

  if (HugeIconType) {
    return (
      <HugeiconsIcon
        icon={HugeIconType}
        size={size}
        strokeWidth={1.5}
        className={cn(iconColorClass, className)}
      />
    )
  }

  if (devIconClass) {
    // Some devicons might need a slightly adjusted size/margin to match Hugeicons visually
    return <i className={cn(`${devIconClass} shrink-0 mt-[1px]`, className)} style={{ fontSize: size - 2 }} />
  }

  // 3. Ultimate fallback
  return (
    <HugeiconsIcon
      icon={File01Icon}
      size={size}
      strokeWidth={1.5}
      className={cn('text-primary-400 dark:text-neutral-500', className)}
    />
  )
}
