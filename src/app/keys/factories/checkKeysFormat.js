angular.module('proton.keys')
    .factory('checkKeysFormat', (
        CONSTANTS,
        passwords,
        pmcw,
        regexEmail
    ) => {

        const { EMAIL_FORMATING } = CONSTANTS;

        /**
         * Validate a key's userID without a known email
         * @param  {String} userId
         * @return {bool}
         */
        function validUserIDUnknownEmail(userId = '') {
            const split = userId.split(' ');
            const emailWithBrackets = split[split.length - 1];
            const emailWithoutBrackets = emailWithBrackets.substring(1, emailWithBrackets.length - 1);
            if (emailWithBrackets[0] !== EMAIL_FORMATING.OPEN_TAG_AUTOCOMPLETE_RAW || emailWithBrackets[emailWithBrackets.length - 1] !== EMAIL_FORMATING.CLOSE_TAG_AUTOCOMPLETE_RAW || !regexEmail.test(emailWithoutBrackets)) {
                return false;
            }
            return true;
        }

        const onValidationError = (o = {}) => {
            if (o.validationError) {
                throw new Error(o.validationError);
            }
            return o;
        };

        /**
         * Get the validation promises corresponding to the primary keys
         * @param  {Array} primaryKeys
         * @param  {Array} addresses
         * @return {Array}
         */
        function getPrimaryKeyPromises(primaryKeys = []) {
            // For primary keys, we will determine which email to use by comparing their fingerprints with the address keys
            return _.reduce(primaryKeys, (acc, privKey) => {
                const userId = privKey.users[0].userId.userid;

                // Make sure the User ID matches the pattern "something <email>"
                if (!validUserIDUnknownEmail(userId)) {
                    acc.push(Promise.reject(new Error('Invalid UserID ' + userId)));
                    return acc;
                }

                const split = userId.split(' ');
                const emailWithBrackets = split[split.length - 1];
                const email = emailWithBrackets.substring(1, emailWithBrackets.length - 1);

                const keyInfo = pmcw.keyInfo(privKey.armor(), email, false)
                    .then(onValidationError);
                acc.push(keyInfo);
                return acc;
            }, []);
        }
        /**
         * Get the validation promises corresponding to the address keys
         * @param  {Array} addressKeys
         * @param  {Array} addresses
         * @return {Array}
         */
        function getAddressKeyPromises(keys = [], addresses = []) {

            const { promises, privateKeys } = _.reduce(keys, (acc, privKeys, addressID) => {
                if (addressID !== '0') {
                    const { Email = '' } = _.findWhere(addresses, { ID: addressID }) || {};

                    acc.privateKeys = acc.privateKeys.concat(privKeys);

                    const list = _.map(privKeys, (privKey) => {
                        return pmcw.keyInfo(privKey.armor(), Email, false)
                            .then(onValidationError);
                    });
                    acc.promises = acc.promises.concat(list);
                }
                return acc;
            }, { promises: [], privateKeys: [] });

            promises.push(pmcw.signMessage(privateKeys));
            return promises;
        }

        return (user, keys) => {
            const primaryKeys = keys['0'];
            const primaryKeyPromises = getPrimaryKeyPromises(primaryKeys);
            const addressKeyPromises = getAddressKeyPromises(keys, user.Addresses);

            return Promise.all(primaryKeyPromises.concat(addressKeyPromises));
        };
    });
