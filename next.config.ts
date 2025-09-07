
import 'dotenv/config';
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  unstable_allowDynamic: [
    '**/node_modules/firebase-admin/lib/app/credential-internal.js',
    '**/node_modules/firebase-admin/lib/app/firebase-namespace.js',
    '**/node_modules/@google-cloud/firestore/build/src/v1/firestore_client.js'
  ],
  allowedDevOrigins: [
    "9000-firebase-studio-1747212355277.cluster-cxy3ise3prdrmx53pigwexthgs.cloudworkstations.dev",
    "6000-firebase-studio-1747212355277.cluster-cxy3ise3prdrmx53pigwexthgs.cloudworkstations.dev"
  ],
};

export default nextConfig;
