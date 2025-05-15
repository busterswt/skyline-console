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
import { inject, observer } from 'mobx-react';
import QRCode from 'qrcode.react';
import {
  Row,
  Layout,
  Col,
  Avatar,
  Switch,
  Typography,
  Card,
  Button,
  Select,
  Image,
  Input,
} from 'antd';
import { InfoCircleFilled } from '@ant-design/icons';
import globalUserStore from 'stores/keystone/user';
import globalSkylineStore from 'stores/skyline/skyline';
import ProfileIcon from 'asset/image/profile.svg';
import Google from 'asset/image/google.svg';
import Google_auth from 'asset/image/authenticator.png';
import Arrow from 'asset/image/arrow.png';
import Playstore from 'asset/image/playstore.png';
import Appstore from 'asset/image/app-store.png';
import SimpleForm from 'components/SimpleForm';
import classnames from 'classnames';
import styles from './styles.less';
const { Title, Text } = Typography;
const { Meta } = Card;

export class Overview extends Component {
  constructor(props) {
    super(props);
    this.init();
    this.state = {
      detail: {},
      enabled: false,
      totp: false,
      error: false,
      loading: false,
      message: '',
      uri: ``,
      secret: '',
    };
  }

  componentDidMount() {
    this.getDomains();
    this.getRegions();
    this.fetchData();
  }
  async getRegions() {
    await this.store.fetchRegionList();
    this.updateDefaultValue();
  }
  async getDomains() {
    await this.store.fetchDomainList();
    this.updateDefaultValue();
  }
  updateDefaultValue = () => {
    if (this.formRef.current && this.formRef.current.resetFields) {
      this.formRef.current.resetFields();
    }
  };



  async fetchData() {
    const {
      user: { user },
    } = this.props.rootStore;
    const details = await globalUserStore.pureFetchDetail({ id: user.id });
    this.setState({
      detail: details,
    });
  }

  renderInfoItem(item) {
    return (
      <Row className={styles['user-info-detail-item']}>
        <Col span={6}>{item.label}</Col>
        <Col span={18}>{item.value}</Col>
      </Row>
    );
  }
  get domains() {
    return (this.store.domains || []).map((it) => ({
      label: it,
      value: it,
    }));
  }
  get regions() {
    return (this.store.regions || []).map((it) => ({
      label: it,
      value: it,
    }));
  }
  get defaultValue() {
    const data = {
      loginType: 'password',
    };
    if (this.regions.length === 1) {
      data.region = this.regions[0].value;
    }
    if (this.domains.length === 1) {
      data.domain = this.domains[0].value;
    }
    return data;
  }
  get rootStore() {
    return this.props.rootStore;
  }
  get user() {
    const { user } = this.props.rootStore;
    return user;
  }
  get project() {
    const {
      project: {
        name: project_name = '',
        domain: { name: project_domain } = {},
      } = {},
    } = this.user || {};
    return {
      project_name,
      project_domain,
    };
  }
  get userId() {
    const { user: { id: id = '' } = {} } = this.user || {};
    return {
      id,
    };
  }
  totpGen(values) {
    globalUserStore.generateTOTP(values).then(
      (value) => {
        this.setState({
          uri: `otpauth://totp/${values.username}?secret=${value}&issuer=Keystone`,
          secret: value,
        });
      },
      (error) => {
        console.log(error);
      }
    );
    this.setState((prevState) => ({ totp: !prevState.totp }));
  }
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
    return t('Username or password is incorrect');
  }
  onLoginFailed = (error) => {
    this.setState({
      loading: false,
    });
    const {
      data: { detail = '' },
    } = error.response;
    const message = detail || '';
    this.setState({
      error: true,
      message,
    });
  };
  onLoginSuccess = (values) => {
    this.setState({
      loading: false,
      error: false,
    });
    this.totpGen(values);
  };
  onFinish = (values) => {
    let passcode = 0;
    this.setState({
      loading: true,
      message: '',
      error: false,
    });
    const body = { ...values, passcode };
    this.rootStore.login(body).then(
      () => {
        this.onLoginSuccess(body);
      },
      (error) => {
        this.onLoginFailed(error);
      }
    );
  };
  init() {
    this.store = globalSkylineStore;
    this.formRef = React.createRef();
  }
  get formItems() {
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
      message: t('Please select your Domain!'),
      render: () => (
        <Select placeholder={t('Select a domain')} options={this.domains} />
      ),
    };
    const usernameItem = {
      name: 'username',
      required: true,
      message: t('Please input your Username!'),
      render: () => <Input placeholder={t('Username')} />,
    };
    const passwordItem = {
      name: 'password',
      required: true,
      message: t('Please input your Password!'),
      render: () => <Input.Password placeholder={t('Password')} />,
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
              {t('Create TOTP')}
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
      submitItem,
    ];
    return [...namePasswordItems];
  }

  renderUserInfo() {
    const { detail = {} } = this.state;
    const data = {
      [t('Username')]: detail.name || '-',
      [t('Email')]: detail.email || '-',
      [t('Phone')]: detail.phone || '-',
      [t('Real Name')]: detail.real_name || '-',
      [t('User ID')]: detail.id,
    };
    return (
      <>
        <Col
          span={3}
          className={classnames(styles.hvc, styles['user-info-avatar'])}
        >
          <Avatar
            size={{ xs: 33, sm: 44, md: 55, lg: 88, xl: 110, xxl: 138 }}
            src={ProfileIcon}
          />
        </Col>
        <Col span={21}>
          <Row className={styles['user-info-detail']}>
            {Object.keys(data).map((item) => {
              return (
                <Col span={12} key={`user_info_detail_${item}`}>
                  {this.renderInfoItem({
                    label: item,
                    value: data[item],
                  })}
                </Col>
              );
            })}
          </Row>
        </Col>
      </>
    );
  }

  renderExtra() {
    return null;
  }

  render() {
    return (
      <Layout.Content className={styles.content}>
        <Row className={classnames(styles.bgc, styles['user-info-card'])}>
          {this.renderUserInfo()}
        </Row>
        {this.renderExtra()}
        <Layout.Footer>
          {!this.state.enabled ? (
            <Card>
              <Row>
                <Col span={24}>
                  <Meta
                    style={{ marginTop: '-0.5rem', fontSize: '1rem' }}
                    title={
                      <Row align="middle" justify="space-between">
                        <Col>
                          <Row align="middle">
                            <Avatar
                              size={{
                                xs: 43,
                                sm: 57,
                                md: 72,
                                lg: 114,
                                xl: 143,
                                xxl: 179,
                              }}
                              src={Google}
                            />
                            <Typography.Title level={4}>
                              Google Authenticator
                            </Typography.Title>
                          </Row>
                        </Col>
                        <Col>
                          <Switch
                            checked={this.state.enabled}
                            onChange={() => this.setState((prevState) => ({
                              enabled: !prevState.enabled,
                            }))}
                            style={{ align: 'right' }}
                          />
                        </Col>
                      </Row>
                    }
                    description="Use Google Authenticator app to generate time-based one-time passwords for your account."
                  />
                </Col>
              </Row>
            </Card>
          ) : (
            <Card
              title={
                <Row align="middle">
                  <Avatar
                    size={{
                      xs: 43,
                      sm: 57,
                      md: 72,
                      lg: 114,
                      xl: 143,
                      xxl: 179,
                    }}
                    src={Google}
                  />
                  <Typography.Title level={4}>
                    Google Authenticator
                  </Typography.Title>
                </Row>
              }
              extra={
                <Switch
                  disabled={this.state.totp}
                  checked={this.state.enabled}
                  onChange={() => this.setState((prevState) => ({
                    enabled: !prevState.enabled,
                  }))}
                />
              }
            >
              {!this.state.totp ? (
                <>
                  <Typography>
                    <Title level={2}>
                      Activating Google Authenticator Guide
                    </Title>
                    <Title level={4}>
                      Step 1: Install Google Authenticator app
                    </Title>
                    <Row gutter={24} align="middle">
                      <Col>
                        <Image height={90} preview={false} src={Playstore} />
                      </Col>
                      <Col>
                        <Image height={50} preview={false} src={Arrow} />
                      </Col>
                      <Col>
                        <Avatar
                          size={{
                            xs: 22,
                            sm: 29,
                            md: 36,
                            lg: 57,
                            xl: 72,
                            xxl: 90,
                          }}
                          src={Google_auth}
                          style={{ marginBottom: '1rem' }}
                        />
                      </Col>
                      <Col>
                        <Image
                          height={50}
                          preview={false}
                          src={Arrow}
                          style={{ transform: 'scaleX(-1)' }}
                        />
                      </Col>
                      <Col>
                        <Image height={90} preview={false} src={Appstore} />
                      </Col>
                    </Row>
                    <Title level={4}>Step 2: Complete the form</Title>
                    <SimpleForm
                      formItems={this.formItems}
                      name="normal_login"
                      className={styles['login-form']}
                      initialValues={this.defaultValue}
                      onFinish={this.onFinish}
                      formref={this.formRef}
                      size="large"
                    />
                  </Typography>
                </>
              ) : (
                <>
                  <Typography>
                    <Title level={4}>
                      Use QR code with your app / Manually enter secret
                    </Title>
                    <Row gutter={24} align="middle">
                      <Col>
                        <QRCode value={this.state.uri} />
                      </Col>
                      <Col span={1}>
                        <Title style={{ color: 'blue' }} level={4}>
                          OR
                        </Title>
                      </Col>
                      <Col
                        span={12}
                        style={{
                          background: 'whitesmoke',
                          borderRadius: '10px',
                          padding: '1.3rem 2rem',
                          maxWidth: '9rem',
                        }}
                      >
                        <Text
                          style={{ fontSize: '1rem' }}
                          copyable={{ text: this.state.secret }}
                        >
                          {this.state.secret}
                        </Text>
                      </Col>
                    </Row>
                  </Typography>
                </>
              )}
            </Card>
          )}
        </Layout.Footer>
      </Layout.Content>
    );
  }
}

export default inject('rootStore')(observer(Overview));
