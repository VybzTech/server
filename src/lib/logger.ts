const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

export const logger = {
  error: (message: string, error?: unknown) => {
    console.error(`${colors.red}[ERROR]${colors.reset} ${message}`);
    if (error) {
      console.error(error);
    }
  },

  success: (message: string, data?: unknown) => {
    console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
  if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  },

  info: (message: string, data?: unknown) => {
    console.log(`${colors.blue}[INFO]${colors.reset} ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  },

  warn: (message: string, data?: unknown) => {
    console.warn(`${colors.yellow}[WARN]${colors.reset} ${message}`);
    if (data) {
      console.table(data);
    }
  },

  debug: (message: string, data?: unknown) => {
    console.log(`${colors.cyan}[DEBUG]${colors.reset} ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  },
};
