#!/usr/bin/env node
import { App } from '@aws-cdk/cdk';

import { CdkWorkshopStack } from '../lib/cdk-workshop-stack';

const app = new App();
new CdkWorkshopStack(app, 'CdkWorkshopStack');
app.run();
