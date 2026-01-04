type InlineIconProps = {
  svg: string
  className?: string
}

export function InlineIcon({ svg, className }: InlineIconProps) {
  return (
    <span
      className={['inline-flex', className].filter(Boolean).join(' ')}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
