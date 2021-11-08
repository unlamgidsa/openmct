/*****************************************************************************
 * Open MCT, Copyright (c) 2014-2021, United States Government
 * as represented by the Administrator of the National Aeronautics and Space
 * Administration. All rights reserved.
 *
 * Open MCT is licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * Open MCT includes source code licensed under additional open source
 * licenses. See the Open Source Licenses file (LICENSES.md) included with
 * this source code distribution or the Licensing information page available
 * at runtime from the About dialog for additional information.
 *****************************************************************************/

import {
    createOpenMct,
    resetApplicationState
} from 'utils/testing';
import {
    createMyItemsIdentifier,
    MY_ITEMS_KEY
} from './createMyItemsIdentifier';

const MISSING_NAME = `Missing: ${MY_ITEMS_KEY}`;
const myItemsIdentifier = createMyItemsIdentifier();

describe("the plugin", () => {
    let openmct;
    let missingObj = {
        identifier: myItemsIdentifier,
        type: 'unknown',
        name: MISSING_NAME
    };

    beforeEach((done) => {
        openmct = createOpenMct();

        openmct.install(openmct.plugins.MyItems());

        openmct.on('start', done);
        openmct.startHeadless();
    });

    afterEach(() => {
        return resetApplicationState(openmct);
    });

    it('when installed, adds "My Items" to the root', async () => {
        const root = await openmct.objects.get('ROOT');
        const rootCompostionCollection = openmct.composition.get(root);
        const rootCompostion = await rootCompostionCollection.load();
        let myItems = rootCompostion.filter((domainObject) => {
            return openmct.objects.areIdsEqual(domainObject.identifier, myItemsIdentifier);
        })[0];

        expect(myItems).toBeDefined();
    });

    describe('adds an interceptor that returns a "My Items" model for', () => {
        let myItemsMissing;
        let mockMissingProvider;
        let activeProvider;

        beforeEach(async () => {
            mockMissingProvider = {
                get: () => Promise.resolve(missingObj)
            };

            activeProvider = mockMissingProvider;
            spyOn(openmct.objects, 'getProvider').and.returnValue(activeProvider);
            myItemsMissing = await openmct.objects.get(myItemsIdentifier);
        });

        it('missing objects', () => {
            let idsMatchMissing = openmct.objects.areIdsEqual(myItemsMissing.identifier, myItemsIdentifier);

            expect(myItemsMissing).toBeDefined();
            expect(idsMatchMissing).toBeTrue();
        });
    });

});
