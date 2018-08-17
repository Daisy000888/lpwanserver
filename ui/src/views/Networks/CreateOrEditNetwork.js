import React, {Component} from "react";
import PT from 'prop-types';
import { withRouter } from 'react-router-dom';
import { propOr, pathOr, lensPath, append, set, pick, clone, equals } from 'ramda';
import qs from 'query-string';
import { dispatchError } from '../../utils/errorUtils';
import { arrayify } from '../../utils/generalUtils';
import sessionStore from "../../stores/SessionStore";
import networkProtocolStore from "../../stores/NetworkProtocolStore";
import networkStore from "../../stores/NetworkStore";
import { inputEventToValue, fieldSpecsToValues } from '../../utils/inputUtils';
import { idxById } from '../../utils/objectListUtils';
import { navigateToExernalUrl } from '../../utils/navUtils';
import NetworkForm from '../../components/NetworkForm';
import ConfirmationDialog from '../../components/ConfirmationDialog';

//******************************************************************************
// The interface
//******************************************************************************

const propTypes = {
  isNew: PT.bool,       // are we creating a new network (as opposed to editing existing)
  networkId: PT.string, // ignored if isNew === true
};

const defaultProps = {
  isNew: false,
};

//******************************************************************************
// CreateOrEditNetwork container
//******************************************************************************

const networkProps =
  [ 'id', 'name', 'networkProviderId', 'networkTypeId', 'networkProtocolId', 'baseUrl' , 'securityData' ];

class CreateOrEditNetwork extends Component {

  static contextTypes = {
    router: PT.object.isRequired
  };

  constructor(props, ...rest) {
    super(props, ...rest);

    this.state = {

      // pending values for network being created/updated.
      name: '',
      networkProviderId: 0,
      networkTypeId: 0,
      networkProtocolId: 0,
      baseUrl: '',
      securityData: {},

      // bookkeeping
      networkProtocol: {},
      authNeeded: false,
      successModalOpen: false,
      failureModalOpen: false,
      authErrorMessages: [],
      authSuccessMessages: [],
      dirtyFields: {}
    };

    this.onSubmit = this.onSubmit.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onDelete = this.onDelete.bind(this);
    this.gotoListPage = this.gotoListPage.bind(this);
    this.successModal = this.successModal.bind(this);
    this.failureModal = this.failureModal.bind(this);
    this.oauthNotify = this.oauthNotify.bind(this);
    this.successModalClose = this.successModalClose.bind(this);
    this.failureModalClose = this.failureModalClose.bind(this);
    this.oauthNotifyClose = this.oauthNotifyClose.bind(this);
  }

  componentDidMount() {

    // NOTES: we may be here because
    // * starting to create a new network
    // * starting to edit an existing network
    // * returing from ouath attempt on a network create/update

    const { isNew, networkId } = this.props;

    fetchNetworkInfo(!isNew && networkId)
    .then(({ network, networkProtocols })=> {

      const queryParams = qs.parse(pathOr({}, [ 'location', 'search' ],  this.props));

      const networkTypeIdforNew = Number(propOr(-1,'networkTypeId', queryParams));
      const networkProtocolIdforNew = Number(propOr(-1, 'networkProtocolId', queryParams));

      const networkProtocolId = propOr(-1, 'networkProtocolId', network);
      const networkProtocol = getProtocol(isNew ? networkProtocolIdforNew : networkProtocolId, networkProtocols);
      const networkProtocolName = propOr('-error-', 'name', networkProtocol);

      const networkData = isNew ?
      {
        name: '',
        networkProviderId: -1, // for now, not providing network provider
        networkTypeId: networkTypeIdforNew,
        networkProtocolId: networkProtocolIdforNew,
        baseUrl: '',
        securityData: getSecurityDefaults(networkProtocol),
      }
      : pick(networkProps, network);

      const authNeeded = isNew;
      this.setState({ authNeeded, networkProtocol,  ...networkData });

      // Lets see if we are coming back from an oauth
      const oauthStatus = propOr('', 'oauthStatus', queryParams);
      if ( oauthStatus ) {

        const authorized = pathOr(false, ['securityData', 'authorized'], networkData);
        const oauthErrorMessage = propOr('', 'oauthError', queryParams);
        const serverErrorMessage = propOr('', 'serverError', queryParams);
        const serverNoauthReason = 'Server was not able to contact network'; // coming soon : pathOr(false, ['securityData', 'message'], networkData);

        if ( oauthStatus === 'success' && authorized ) {
          this.successModal();
        }

        else if ( oauthStatus === 'success' && !authorized ) {
          this.failureModal([
            `Your authorization information was valid, but LPWAN server was not able to connect to the ${networkProtocolName} server`,
            serverErrorMessage, serverNoauthReason ]);
        }

        else if ( oauthStatus === 'fail' && !authorized ) {
          this.failureModal([
            `Your ${networkProtocolName} authorization information was not valid`,
            oauthErrorMessage ]);
        }

        else if ( oauthStatus === 'fail' && authorized ) {
          this.failureModal([
            `Your authorization information seemed to be invalid, but you appear to be authorized`,
            'This is an abnormal state.  It is advised that you reauthorize with this network by re-entering your authorizaion information',
            oauthErrorMessage ]);
        }
      }
    })
    .catch(err => dispatchError(
      `Error retrieving information while trying to ${isNew?'create':'edit'} ` +
      `network ${isNew?'':networkId}: ${err}`
    ));
  }

  onChange(path, field, e) {

    const value = inputEventToValue(e);
    const { dirtyFields={}, networkProtocol={} } = this.state;
    const { isNew } = this.props;

    const fieldLens = lensPath([...path, field]);
    const pendingDirtyFields = set(fieldLens, true, dirtyFields);
    const authNeeded = isNew || reAuthNeeded(networkProtocol, pendingDirtyFields);

    this.setState({
      ...set(fieldLens, value, this.state),
      authNeeded, dirtyFields: pendingDirtyFields,
    });
  }

  onSubmit(e) {

    e.preventDefault();
    const { isNew } = this.props;
    const { networkProtocol, securityData={}, authNeeded } = this.state;

    const networkProtocolName = propOr('-error-', 'name', networkProtocol);
    const securityProps = getSecurityProps(networkProtocol);

    const securityDataToSubmit = authNeeded ?
      { ...pick(securityProps, securityData), authorized: false } :
      pick(securityProps, securityData);

    const mutateMethod = isNew ? 'createNetwork' : 'updateNetwork';
    networkStore[mutateMethod]({
      ...pick(networkProps, this.state),
      securityData: securityDataToSubmit
    })

    .then( updatedNetwork => {

      const networkId = propOr(-1, 'id', updatedNetwork);
      const oauthUrl = pathOr('', ['metaData', 'oauthUrl'], networkProtocol);
      const authorized = pathOr(false, ['securityData', 'authorized'], updatedNetwork);

      console.log('isNew: ', isNew);
      console.log('authNeeded: ', authNeeded);
      console.log('authorized: ', authorized);

      // go to oauth page if needed
      if (oauthUrl && authNeeded) {
        const oauthRedirect = makeOauthRedirectUrl(networkProtocol, securityData,);
        sessionStore.putSetting('oauthNetworkTarget', networkId);
        sessionStore.putSetting('oauthStartTime', Date.now());
        navigateToExernalUrl(oauthRedirect);
      }

      // non-ouath backend auth succeeded
      else if (isNew && authorized) {
        this.successModal();
      }

      // non-ouath backend auth succeeded
      else if ( !isNew && authNeeded && authorized) {
        this.successModal([
          `After updating your ${networkProtocolName} authorization information, authorization was succeseful.`]);
      }

      // non-ouath backend auth failed for new network
      else if (isNew && !authorized) {
        this.failureModal([
          `Your ${networkProtocolName} authorization information was not valid`,]);
      }

      // non-ouath backend auth failed for updated network
      else if (!isNew && authNeeded && !authorized) {
        this.failureModal([
          `After updating your ${networkProtocolName} authorization information, authorization failed.`,
          `The updated authorization information was not valid` ]);
      }

      // otherwise go to network list page
      else {
        this.props.history.push('/admin/networks');
      }
    })

    // the create/update failed
    .catch( err => {
      // if we get here, the create/update failed,
      this.failureModal([ `Your ${networkProtocolName} Submit failed: ${err}` ]);});
    }

  onDelete(e) {
    e.preventDefault();
    const { networkId } = this.props;
    //eslint-disable-next-line
    if (networkId && confirm("Are you sure you want to delete this network?")) {
      networkStore.deleteNetwork(networkId)
      .then( (responseData) => {this.props.history.push('/admin/networks');})
      .catch( (err) => { alert( "Delete failed:" + err ); } );
    }
  }

  gotoListPage = () => this.props.history.push('/admin/networks');
  successModal = (msgs=[]) => this.setState({successModalOpen: true, authSuccessMessages: arrayify(msgs)});
  failureModal = (msgs=[]) => this.setState({failureModalOpen: true, authErrorMessages: arrayify(msgs)});
  successModalClose = () => this.setState({successModalOpen: false, authSuccessMessages: []});
  failureModalClose = () => this.setState({failureModalOpen: false, authErrorMessages: []});
  oauthNotify = () => this.setState({oauthNotifyModalOpen: true});
  oauthNotifyClose = () => this.setState({oauthNotifyModalOpen: false});
  setModalErrorMessages = messages => this.setState({ authErrorMessages : messages });

  render() {

    const { networkProtocol, authNeeded } = this.state;
    const { isNew } = this.props;
    const { onChange, onSubmit, onDelete } = this;

    const networkData = pick(networkProps, this.state);
    const networkProtocolName = propOr('-error-', 'name', networkProtocol);
    const networkProtocolFields = getNetworkFields(networkProtocol);
    const submitText = generateSubmitText(isNew, authNeeded, networkProtocolName);

    return (
      <div>
        <NetworkForm
          {...{ onChange, onSubmit, onDelete, submitText }}
          {...{ isNew, networkProtocolName, networkProtocolFields, networkData }}
        />

      <ConfirmationDialog
        open={this.state.successModalOpen}
        title='Network Succesfully Authorized'
        subTitle={`You are authorized with ${networkProtocolName}, and will now be able to add applications and devices`}
        text={this.state.authSuccessMessages||[]} textClass='txt-color-alt'
        confButtons={[{ label: 'OK', className: 'btn-primary', onClick: this.gotoListPage }]}
      />

      <ConfirmationDialog
        open={this.state.failureModalOpen}
        title='Authorization Failed'
        subTitle='You may continue editing the network, discard it, or save the information you entered without network authorization'
        text={this.state.authErrorMessages||[]} textClass='text-danger'
        confButtons={[
          { label: 'Discard Network', className: 'btn-danger', onClick: this.onDelete, },
          { label: 'Continue Editing', className: 'btn-default', onClick: this.failureModalClose, },
          { label: 'Save', className: 'btn-default', onClick: this.gotoListPage, },
        ]}
      />
      </div>
    );
  }
}

export default withRouter(CreateOrEditNetwork);

CreateOrEditNetwork.propTypes = propTypes;
CreateOrEditNetwork.defaultProps = defaultProps;

//******************************************************************************
// Helper Functions
//******************************************************************************

function makeOauthRedirectUrl(networkProtocol, securityData) {

  const oauthUrl = pathOr('', ['metaData', 'oauthUrl'], networkProtocol);
  if ( !oauthUrl ) return '';

  const thisServer = process.env.REACT_APP_PUBLIC_BASE_URL;
  const frontEndOauthReturnUri = `${thisServer}/admin/networks/oauth`;
  const queryParams = pathOr([], ['metaData', 'oauthRequestUrlQueryParams'], networkProtocol);

  const queryParamString = queryParams.reduce((qpStr, qp, i)=>
    `${qpStr}${i>0 ? '&':'?'}${makeQueryParam(qp, securityData, frontEndOauthReturnUri)}`, '');

  return `${oauthUrl}${queryParamString}`;
}

function makeQueryParam(qeuryParamSpec={}, securityData={}, frontEndOauthReturnUri ) {
  const { name, valueSource, value, protocolHandlerNetworkField } = qeuryParamSpec;

  const queryValue =
    valueSource === 'value' ? value :
    valueSource === 'protocolHandlerNetworkField' ? securityData[protocolHandlerNetworkField] :
    valueSource === 'frontEndOauthReturnUri' ? frontEndOauthReturnUri : 'unknown value source';
  return `${name}=${queryValue}`;
}

// pass in falsey networkId to skip network fetch
async function fetchNetworkInfo(networkId) {
  const networkProtocols = networkProtocolStore.getNetworkProtocols();
  const network = networkId ? networkStore.getNetwork(networkId) : Promise.resolve({});

  return {
    network: await network,
    networkProtocols: propOr([], 'records', await networkProtocols),
  };
}

function reAuthNeeded(networkProtocol, dirtyFields) {
  const securityProps = getSecurityProps(networkProtocol);
  return (
    propOr(false, 'baseUrl', dirtyFields) ||
    securityPropsDirty(securityProps, dirtyFields)
  );
}

function securityPropsDirty(securityProps, dirtyFields) {
  return securityProps.reduce((dirty,securityProp) =>
    dirty || pathOr(false, [ 'securityData', securityProp ], dirtyFields),false);
}

function generateSubmitText(isNew, authNeeded, networkProtocolName) {
  return isNew ? [
    `You will be authorized with the ${networkProtocolName} provider.`,
    'You may be directed to provide appropriate credentials.'
  ] :
  authNeeded ? [
    `${networkProtocolName} authoriztion information changed. You will be re-authorized  with the ${networkProtocolName} provider.`,
    'You may be directed to provide appropriate credentials.'
  ] : '';
}

function getProtocol(networkProtocolId, networkProtocols) {
  const networkProtocolIndex = idxById(networkProtocolId, networkProtocols);
  return networkProtocols[networkProtocolIndex];
}

function getNetworkFields(networkProtocol) {
  return pathOr([], ['metaData', 'protocolHandlerNetworkFields'], networkProtocol);
}

function getSecurityProps(networkProtocol) {
  const protoFields = getNetworkFields(networkProtocol);
  return protoFields.reduce((propAccum,curField)=>
    curField.name ? append( curField.name, propAccum) : propAccum, []);
}

function getSecurityDefaults(networkProtocol) {
  const networkFields = getNetworkFields(networkProtocol);
  return fieldSpecsToValues(networkFields);
}
