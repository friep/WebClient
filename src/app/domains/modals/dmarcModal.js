/* @ngInject */
function dmarcModal(pmModal, $rootScope) {
    return pmModal({
        controllerAs: 'ctrl',
        templateUrl: require('../../../templates/modals/domain/dmarc.tpl.html'),
        /* @ngInject */
        controller: function(params) {
            this.domain = params.domain;
            this.step = params.step;
            this.open = (name) => {
                $rootScope.$broadcast(name, params.domain);
            };
            this.verify = () => {
                params.verify();
            };
            this.close = () => {
                params.close();
            };
        }
    });
}
export default dmarcModal;
