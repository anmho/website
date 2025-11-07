interface SectionContainerProps extends React.ComponentPropsWithRef<'div'> {
  children?: React.ReactNode;
  className?: string;
}

function SectionContainer({
  children,
  className,
  ...rest
}: SectionContainerProps) {
  return (
    <section
      className={`xl:max-w-[1440px] w-full flex flex-row text-center sm:px-20 px-5 justify-center align-center ${className} `}
      {...rest}
    >
      {children}
    </section>
  );
}

export default SectionContainer;
