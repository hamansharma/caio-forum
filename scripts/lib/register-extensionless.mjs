// Use with `node --import ./scripts/lib/register-extensionless.mjs <script>`.
import { register } from 'node:module';

register('./extensionless-loader.mjs', import.meta.url);
