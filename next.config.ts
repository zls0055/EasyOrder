
import 'dotenv/config';
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  allowedDevOrigins: [
    "9000-firebase-studio-1747212355277.cluster-cxy3ise3prdrmx53pigwexthgs.cloudworkstations.dev",
    "6000-firebase-studio-1747212355277.cluster-cxy3ise3prdrmx53pigwexthgs.cloudworkstations.dev"
  ],
};

export default nextConfig;
