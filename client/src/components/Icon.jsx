function normalizeIcon(svg) {
  return svg
    .replace(/fill="#000000"/g, 'fill="currentColor"')
    .replace(/width="[0-9]+px"/, 'width="1em"')
    .replace(/height="[0-9]+px"/, 'height="1em"')
}

export default function Icon({ svg, className = '', ...rest }) {
  return (
    <span
      className={`inline-block align-middle leading-none ${className}`}
      dangerouslySetInnerHTML={{ __html: normalizeIcon(svg) }}
      {...rest}
    />
  )
}
