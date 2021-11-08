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

describe("The URLTimeSettingsSynchronizer", () => {
    let appHolder;
    let openmct;
    let resolveFunction;
    let oldHash;

    beforeEach((done) => {
        openmct = createOpenMct();
        openmct.install(openmct.plugins.MyItems());
        openmct.install(openmct.plugins.LocalTimeSystem());
        openmct.install(openmct.plugins.UTCTimeSystem());

        openmct.on('start', done);

        appHolder = document.createElement("div");
        openmct.start(appHolder);
    });

    afterEach(() => {
        openmct.time.stopClock();
        openmct.router.removeListener('change:hash', resolveFunction);

        appHolder = undefined;
        openmct = undefined;
        resolveFunction = undefined;

        return resetApplicationState(openmct);
    });

    it("initial clock is set to fixed is reflected in URL", (done) => {
        resolveFunction = () => {
            oldHash = window.location.hash;
            expect(window.location.hash.includes('tc.mode=fixed')).toBe(true);

            openmct.router.removeListener('change:hash', resolveFunction);
            done();
        };

        openmct.router.on('change:hash', resolveFunction);
    });

    it("when the clock is set via the time API, it is reflected in the URL", (done) => {
        let success;

        resolveFunction = () => {
            openmct.time.clock('local', {
                start: -2000,
                end: 200
            });

            const hasStartDelta = window.location.hash.includes('tc.startDelta=2000');
            const hasEndDelta = window.location.hash.includes('tc.endDelta=200');
            const hasLocalClock = window.location.hash.includes('tc.mode=local');
            success = hasStartDelta && hasEndDelta && hasLocalClock;
            if (success) {
                expect(success).toBe(true);

                openmct.router.removeListener('change:hash', resolveFunction);
                done();
            }
        };

        openmct.router.on('change:hash', resolveFunction);
    });

    it("when the clock mode is set to local, it is reflected in the URL", (done) => {
        let success;

        resolveFunction = () => {
            let hash = window.location.hash;
            hash = hash.replace('tc.mode=fixed', 'tc.mode=local');
            window.location.hash = hash;

            success = window.location.hash.includes('tc.mode=local');
            if (success) {
                expect(success).toBe(true);
                done();
            }
        };

        openmct.router.on('change:hash', resolveFunction);
    });

    it("when the clock mode is set to local, it is reflected in the URL", (done) => {
        let success;

        resolveFunction = () => {
            let hash = window.location.hash;

            hash = hash.replace('tc.mode=fixed', 'tc.mode=local');
            window.location.hash = hash;
            success = window.location.hash.includes('tc.mode=local');
            if (success) {
                expect(success).toBe(true);
                done();
            }
        };

        openmct.router.on('change:hash', resolveFunction);
    });

    it("reset hash", (done) => {
        let success;

        window.location.hash = oldHash;
        resolveFunction = () => {
            success = window.location.hash === oldHash;
            if (success) {
                expect(success).toBe(true);
                done();
            }
        };

        openmct.router.on('change:hash', resolveFunction);
    });
});
