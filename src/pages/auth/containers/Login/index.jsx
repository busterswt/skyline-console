// Copyright 2021 99cloud
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, { Component } from 'react';
import { Input, Button, Select, Row, Col, Image } from 'antd';
import { InputOTP } from 'antd-input-otp';
import { inject, observer } from 'mobx-react';
import { Link } from 'react-router-dom';
import { InfoCircleFilled } from '@ant-design/icons';
import SimpleForm from 'components/SimpleForm';
import globalSkylineStore from 'stores/skyline/skyline';
import globalUserStore from 'stores/keystone/user';
import i18n from 'core/i18n';
import { isEmpty } from 'lodash';
import styles from './index.less';
import Password from 'asset/image/password.png';

export class Login extends Component {
  constructor(props) {
    super(props);
    this.init();
    this.state = {
      detail: {},
      error: false,
      passcodeError: false,
      message: '',
      loading: false,
      totp_enabled: false,
      loginTypeOption: this.passwordOption,
    };
  }

  componentDidMount() {
    this.getRegions();
    this.getSSO();
  }

  async getRegions() {
    await this.store.fetchRegionList();
    this.updateDefaultValue();
  }

  async getSSO() {
    try {
      this.store.fetchSSO();
    } catch (e) {
      console.log(e);
    }
  }

  get rootStore() {
    return this.props.rootStore;
  }

  get info() {
    const { info = {} } = this.rootStore;
    return info || {};
  }

  get productName() {
    const { product_name = { zh: t('Cloud Platform'), en: 'Cloud Platform' } } =
      this.info;
    const { getLocaleShortName } = i18n;
    const language = getLocaleShortName();
    const name =
      product_name[language] || t('Cloud Platform') || 'Cloud Platform';
    return t('Welcome, {name}', { name });
  }

  get regions() {
    return (this.store.regions || []).map((it) => ({
      label: it,
      value: it,
    }));
  }

  get domains() {
    return [];
  }

  get nextPage() {
    const { location = {} } = this.props;
    const { search } = location;
    if (search) {
      return search.split('=')[1];
    }
    return '/base/overview';
  }

  get enableSSO() {
    const { sso: { enable_sso = false } = {} } = this.store;
    return enable_sso;
  }

  get ssoProtocols() {
    return {
      openid: t('OpenID Connect'),
    };
  }

  get SSOOptions() {
    if (!this.enableSSO) {
      return [];
    }
    const { sso: { protocols = [] } = {} } = this.store;
    return protocols.map((it) => {
      const { protocol, url } = it;
      return {
        label: this.ssoProtocols[protocol] || protocol,
        value: url,
        ...it,
      };
    });
  }

  get passwordOption() {
    return {
      label: t('Keystone Credentials'),
      value: 'password',
    };
  }
  get passcodeOption() {
    return {
      label: t('MultiFactor Authentication'),
      value: 'passcode',
    };
  }

  get loginTypeOptions() {
    if (!this.enableSSO) {
      return [];
    }
    return [this.passwordOption, this.passcodeOption, ...this.SSOOptions];
  }

  onLoginTypeChange = (value, option) => {
    this.setState({ loginTypeOption: option });
  };

  get currentLoginType() {
    const { loginTypeOption: { value } = {} } = this.state;
    if (value === 'password') {
      return 'password';
    } 
    if (value === 'passcode') {
      return 'passcode';
    }
    return 'sso';
  }

  get currentSSOLink() {
    const { loginTypeOption: { value } = {} } = this.state;
    return value;
  }

  get defaultValue() {
    const data = {
      loginType: 'password',
    };
    if (this.regions.length === 1) {
      data.region = this.regions[0].value;
    }
    return data;
  }

  get passcodeForm() {
    const { error, loading } = this.state;
    const errorItem = {
      name: 'error',
      hidden: !error,
      render: () => (
        <div className={styles['login-error']}>
          <InfoCircleFilled />
          {this.getErrorMessage()}
        </div>
      ),
    };
    const passcodeItem = {
      name: 'passcode',
      required: true,
      message: t('Please input your Passcode!'),
      render: () => (
        <InputOTP
          inputType="numeric"
          inputRegex="[^0-9]"
          inputClassName={styles['input-classname']}
        />
      ),
    };
    const submitPasscodeItem = {
      name: 'submit',
      render: () => (
        <>
          <Row gutter={24} justify="center">
            <Col span={6.99}>
              <Button
                loading={loading}
                type="primary"
                danger
                htmlType="reset"
                className="login-form-button"
                onClick={() => {
                  this.setState({ totp_enabled: false, detail: {} });
                  this.formRef.current.resetFields();
                }}
              >
                {t('Cancel')}
              </Button>
            </Col>
            <Col span={6}>
              <Button
                loading={loading}
                type="primary"
                htmlType="submit"
                className="login-form-button"
              >
                {t('Log in')}
              </Button>
            </Col>
            {/* </Row> */}
            {/* <Row gutter={8} justify="center"> */}
          </Row>
        </>
      ),
    };
    const cancelPasscodeItem = {
      name: 'cancel',
      render: () => (
        <Row gutter={8} justify="center">
          <Col span={6.99}>
            <Button
              loading={loading}
              type="primary"
              danger
              htmlType="reset"
              className="login-form-button"
            >
              {t('Cancel')}
            </Button>
          </Col>
        </Row>
      ),
    };
    return [errorItem, passcodeItem, submitPasscodeItem];
    // return [errorItem, passcodeItem, submitPasscodeItem, cancelPasscodeItem];
  }

  get formItems() {
    const { error, loading } = this.state;
    const loginType = this.currentLoginType;
    const errorItem = {
      name: 'error',
      hidden: !error,
      render: () => (
        <div className={styles['login-error']}>
          <InfoCircleFilled />
          {this.getErrorMessage()}
        </div>
      ),
    };
    const regionItem = {
      name: 'region',
      required: true,
      message: t('Please select your Region!'),
      render: () => (
        <Select placeholder={t('Select a region')} options={this.regions} />
      ),
    };
    const domainItem = {
      name: 'domain',
      required: true,
      render: () => (
        <Input placeholder={t('<username> or <username>@<domain>')} />
      ),
      extra: t('Tips: without domain means "Default" domain.'),
      rules: [{ required: true, validator: this.usernameDomainValidator }],
    };
    const usernameItem = {
      name: 'username',
      required: false,
      message: t('Please input your Username!'),
      render: () => <Input placeholder={t('Username')} />,
      hidden: true,
    };
    const passwordItem = {
      name: 'password',
      required: true,
      message: t('Please input your Password!'),
      render: () => <Input.Password placeholder={t('Password')} />,
    };
    const extraItem = {
      name: 'extra',
      hidden: true,
      render: () => (
        <Row gutter={8}>
          <Col span={12}>
            <Link to="password">{t('Forgot your password?')}</Link>
          </Col>
          <Col span={12}>
            <Link to="register" className={styles.register}>
              {t('Sign up')}
            </Link>
          </Col>
        </Row>
      ),
    };
    const submitItem = {
      name: 'submit',
      render: () => (
        <Row gutter={8}>
          <Col span={12}>
            <Button
              loading={loading}
              type="primary"
              htmlType="submit"
              className="login-form-button"
            >
              {t('Log in')}
            </Button>
          </Col>
        </Row>
      ),
    };
    const namePasswordItems = [
      errorItem,
      regionItem,
      domainItem,
      usernameItem,
      passwordItem,
      extraItem,
    ];
    const typeItem = {
      name: 'loginType',
      required: true,
      message: t('Please select login type!'),
      extra: t(
        'If you are not sure which authentication method to use, please contact your administrator.'
      ),
      render: () => (
        <Select
          placeholder={t('Select a login type')}
          options={this.loginTypeOptions}
          onChange={this.onLoginTypeChange}
        />
      ),
    };
    if (!this.enableSSO) {
      return [typeItem, submitItem];
    }
    return [...namePasswordItems, submitItem];
  }

  getUserId = (str) => str.split(':')[1].trim().split('.')[0];

  onLoginFailed = (error) => {
    this.formRef.current.resetFields();
    this.setState({
      loading: false,
    });
    if (error === false) {
      this.setState({
        error: true,
        message: 'Incorrect Password',
      });
    } else {
      const {
        data: { detail = '' },
      } = error.response;
      const message = detail || '';
      this.setState({
        error: true,
        message,
      });
    }
  };

  onLoginSuccess = () => {
    this.setState({
      loading: false,
      error: false,
    });
    if (this.rootStore.user && !isEmpty(this.rootStore.user)) {
      this.rootStore.routing.push(this.nextPage);
    }
  };

  onTotp = (codeArray) => {
    this.setState({
      loading: true,
      message: '',
      error: false,
    });
    const passcode = codeArray.passcode.join('');
    this.setState((prevState) => ({
      loading: true,
      message: '',
      error: false,
      detail: { ...prevState.detail, passcode },
    }));
    this.rootStore.login(this.state.detail).then(
      () => {
        this.onLoginSuccess();
      },
      (error) => {
        this.setState({ passcodeError: true });
        this.onLoginFailed(error);
      }
    );
  };

  onFinish = (values) => {
    let passcode = 0;
    let body = null;
    body = { ...values, passcode };
    this.setState({
      loading: true,
      message: '',
      error: false,
      detail: body,
    });
    globalUserStore.passwordCheck(this.state.detail).then(
      (value) => {
        if (value) {
          globalUserStore.checktotp(body).then(
            (exists) => {
              if (exists) {
                this.setState({ totp_enabled: true, loading: false });
              } else {
                this.rootStore.login(body).then(
                  () => {
                    this.onLoginSuccess();
                  },
                  (error) => {
                    this.setState({ passcodeError: false });
                    this.onLoginFailed(error);
                  }
                );
              }
            },
            (error) => {
              console.log(error);
            }
          );
        } else {
          this.setState({ passcodeError: false });
          this.onLoginFailed(value);
        }
      },
      (error) => {
        this.setState({ passcodeError: false });
        this.onLoginFailed(error);
       }
     );
   };

  getErrorMessage() {
    const { message } = this.state;
    if (message.includes('The account is locked for user')) {
      return t(
        'Frequent login failure will cause the account to be temporarily locked, please operate after 5 minutes'
      );
    }
    if (message.includes('The account is disabled for user')) {
      return t('The user has been disabled, please contact the administrator');
    }
    if (
      message.includes('You are not authorized for any projects or domains')
    ) {
      return t(
        'If you are not authorized to access any project, or if the project you are involved in has been deleted or disabled, contact the platform administrator to reassign the project'
      );
    }
    if (this.state.passcodeError) {
      return t('Passcode is incorrect');
    }
    return t('Username or password is incorrect');
  }

  getUsernameAndDomain = (values) => {
    const { usernameDomain } = values;
    const tmp = usernameDomain.trim().split('@');
    return {
      username: tmp[0],
      domain: tmp[1] || 'Default',
    };
  };

  usernameDomainValidator = (rule, value) => {
    if (!value || !value.trim()) {
      return Promise.reject(
        t('Please input <username> or <username>@<domain name>!')
      );
    }
    const tmp = value.trim().split('@');
    const message = t(
      'Please input the correct format:  <username> or <username>@<domain name>.'
    );
    if (tmp.length > 2) {
      return Promise.reject(new Error(message));
    }
    const { username, domain } = this.getUsernameAndDomain({
      usernameDomain: value,
    });
    if (!username || !domain) {
      return Promise.reject(new Error(message));
    }
    return Promise.resolve();
  };

  dealWithChangePassword = (detail, values) => {
    const userId = this.getUserId(detail);
    const data = {
      region: values.region,
      oldPassword: values.password,
      userId,
    };
    this.rootStore.setPasswordInfo(data);
    this.rootStore.routing.push('/auth/change-password');
  };

  updateDefaultValue = () => {
    if (this.formRef.current && this.formRef.current.resetFields) {
      this.formRef.current.resetFields();
    }
  };

  init() {
    this.store = globalSkylineStore;
    this.formRef = React.createRef();
  }

  renderExtra() {
    return null;
  }

  render() {
    return (
      <>
        <h1 className={styles.welcome}>{this.productName}</h1>
        {!this.state.totp_enabled ? (
          <SimpleForm
            formItems={this.formItems}
            name="normal_login"
            className={styles['login-form']}
            initialValues={this.defaultValue}
            onFinish={this.onFinish}
            formref={this.formRef}
            size="large"
          />
        ) : (
          <>
            <Row gutter={16} justify="center">
              <Col span={18}>
                <Image
                  height={250}
                  preview={false}
                  src={Password}
                  style={{paddingBottom: '1.4rem'}}
                />
              </Col>
            </Row>
            <SimpleForm
              formItems={this.passcodeForm}
              name="normal_login"
              className={styles['login-form']}
              initialValues={this.defaultValue}
              onFinish={this.onTotp}
              formref={this.formRef}
              size="large"
            />
          </>
        )}
        {this.renderExtra()}
      </>
    );
  }
}

export default inject('rootStore')(observer(Login));
