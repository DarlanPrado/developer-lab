export default defineAppConfig({
  ui: {
    colors: {
      primary: 'emerald',
      neutral: 'zinc',
    },
    card: {
      slots: {
        root: 'rounded-xl',
      },
    },
    button: {
      defaultVariants: {
        color: 'primary',
      },
    },
    formField: {
      slots: {
        root: 'w-full',
        wrapper: 'w-full mt-1',
      },
    },
    input: {
      slots: {
        root: 'w-full',
        base: 'w-full',
      },
    },
    textarea: {
      slots: {
        root: 'w-full',
        base: 'w-full',
      },
    },
  },
})
