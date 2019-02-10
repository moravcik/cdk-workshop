#!/usr/bin/env node
import cdk = require('@aws-cdk/cdk');
import { CdkWorkshopStack } from '../lib/cdk-workshop-stack';

const app = new cdk.App();
new CdkWorkshopStack(app, 'CdkWorkshopStack');
app.run();
