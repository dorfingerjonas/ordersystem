import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Ordersystem light theme – warm neutrals + yellow primary,
 * inspired by the "Kellner-App" Claude design prototype.
 */
export const OrderSystemTheme = definePreset(Aura, {
  primitive: {
    borderRadius: {
      none: '0',
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '14px',
      xl: '16px'
    }
  },
  semantic: {
    primary: {
      50: '#fffaeb',
      100: '#fff4da',
      200: '#fde6ad',
      300: '#fbd57a',
      400: '#f8c450',
      500: '#f2b233',
      600: '#d6951c',
      700: '#b07414',
      800: '#8c5a14',
      900: '#734a15',
      950: '#422707'
    },
    focusRing: {
      width: '2px',
      style: 'solid',
      color: '{primary.600}',
      offset: '2px'
    },
    formField: {
      paddingX: '0.875rem',
      paddingY: '0.75rem',
      borderRadius: '{border.radius.md}'
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '#faf9f7',
          100: '#f6f5f2',
          200: '#ece9e3',
          300: '#e2dfd8',
          400: '#cfcbc2',
          500: '#a8a39a',
          600: '#7a766e',
          700: '#5f5f5f',
          800: '#3d3b37',
          900: '#1a1a1a',
          950: '#0f0f0e'
        },
        primary: {
          color: '{primary.500}',
          contrastColor: '#1a1a1a',
          hoverColor: '{primary.400}',
          activeColor: '{primary.600}'
        },
        highlight: {
          background: '{primary.100}',
          focusBackground: '{primary.200}',
          color: '#3d2e08',
          focusColor: '#3d2e08'
        },
        text: {
          color: '{surface.900}',
          hoverColor: '{surface.950}',
          mutedColor: '{surface.700}',
          hoverMutedColor: '{surface.800}'
        },
        content: {
          background: '{surface.0}',
          hoverBackground: '{surface.100}',
          borderColor: '{surface.300}',
          color: '{text.color}',
          hoverColor: '{text.hover.color}'
        },
        formField: {
          background: '{surface.0}',
          borderColor: '{surface.400}',
          hoverBorderColor: '{surface.500}',
          focusBorderColor: '{primary.500}',
          color: '{surface.900}',
          placeholderColor: '{surface.600}'
        }
      }
    }
  },
  components: {
    button: {
      root: {
        borderRadius: '{border.radius.md}',
        paddingY: '0.75rem',
        paddingX: '1rem',
        label: { fontWeight: '700' },
        lg: { fontSize: '1.125rem', paddingY: '1rem', paddingX: '1.25rem' }
      },
      colorScheme: {
        light: {
          root: {
            success: {
              background: '#1e7a4c',
              hoverBackground: '#186640',
              activeBackground: '#145535',
              borderColor: '#1e7a4c',
              hoverBorderColor: '#186640',
              activeBorderColor: '#145535',
              color: '#ffffff',
              hoverColor: '#ffffff',
              activeColor: '#ffffff'
            },
            contrast: {
              background: '#1a1a1a',
              hoverBackground: '#333333',
              activeBackground: '#000000',
              borderColor: '#1a1a1a',
              hoverBorderColor: '#333333',
              activeBorderColor: '#000000',
              color: '#ffffff',
              hoverColor: '#ffffff',
              activeColor: '#ffffff'
            },
            secondary: {
              background: '#ffffff',
              hoverBackground: '{surface.100}',
              activeBackground: '{surface.200}',
              borderColor: '{surface.400}',
              hoverBorderColor: '{surface.500}',
              activeBorderColor: '{surface.500}',
              color: '{surface.900}',
              hoverColor: '{surface.900}',
              activeColor: '{surface.900}'
            }
          }
        }
      }
    },
    selectbutton: {
      root: { borderRadius: '14px' },
      colorScheme: {
        light: {
          root: {
            invalidBorderColor: '{red.500}'
          }
        }
      }
    },
    togglebutton: {
      root: {
        padding: '0.25rem',
        borderRadius: '14px',
        fontWeight: '600'
      },
      content: {
        checkedShadow: '0 1px 2px rgba(0,0,0,0.12)',
        borderRadius: '10px',
        padding: '0.625rem 0.75rem'
      },
      colorScheme: {
        light: {
          root: {
            background: '#e9e6df',
            checkedBackground: '#e9e6df',
            hoverBackground: '#e9e6df',
            borderColor: '#e9e6df',
            color: '#4a4a4a',
            hoverColor: '#1a1a1a',
            checkedColor: '#1a1a1a',
            checkedBorderColor: '#e9e6df'
          },
          content: {
            checkedBackground: '#ffffff'
          }
        }
      }
    },
    toast: {
      root: { width: 'calc(100vw - 32px)', borderRadius: '{border.radius.xl}' },
      summary: { fontWeight: '700', fontSize: '1rem' },
      detail: { fontWeight: '500', fontSize: '0.9375rem' }
    },
    drawer: {
      header: { padding: '1rem 1rem 0.5rem' },
      content: { padding: '0 1rem 1rem' }
    },
    toggleswitch: {
      colorScheme: {
        light: {
          root: {
            checkedBackground: '#1e7a4c',
            checkedHoverBackground: '#186640'
          },
          handle: {
            checkedBackground: '#ffffff',
            checkedHoverBackground: '#ffffff'
          }
        }
      }
    },
    dialog: {
      root: { borderRadius: '{border.radius.xl}' }
    }
  }
});
