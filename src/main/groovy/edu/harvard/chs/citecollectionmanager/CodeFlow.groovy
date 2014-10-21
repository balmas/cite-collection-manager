package edu.harvard.chs.citecollectionmanager

import org.apache.commons.io.FileUtils

import com.google.api.client.auth.oauth2.Credential
import com.google.api.client.extensions.java6.auth.oauth2.FileCredentialStore
import com.google.api.client.extensions.java6.auth.oauth2.AuthorizationCodeInstalledApp
import com.google.api.client.extensions.jetty.auth.oauth2.LocalServerReceiver
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets
import com.google.api.client.http.GenericUrl
import com.google.api.client.http.HttpTransport
import com.google.api.client.http.javanet.NetHttpTransport
import com.google.api.client.json.JsonFactory
import com.google.api.client.json.jackson2.JacksonFactory
import com.google.api.services.oauth2.Oauth2
import com.google.api.services.oauth2.model.Tokeninfo
import com.google.api.services.oauth2.model.Userinfoplus

import java.io.File
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.IOException
import java.util.Arrays
import java.util.List
import javax.jdo.JDOHelper

class CodeFlow {
  public static List<String> scopes = Arrays.asList("https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/fusiontables")
  public GoogleClientSecrets secrets = null;

  public static final HttpTransport HTTP_TRANSPORT = new NetHttpTransport()
  public static final JsonFactory JSON_FACTORY = new JacksonFactory()
  private FileCredentialStore credentialStore = new FileCredentialStore(new File("/tmp/ccm"),JSON_FACTORY)

  public setSecrets(context) {
    BufferedReader br = new BufferedReader(new InputStreamReader(context.getResourceAsStream("client_secrets.json")))
    secrets = GoogleClientSecrets.load(JSON_FACTORY, br)
  }
  
  public build() {
    return new GoogleAuthorizationCodeFlow.Builder(HTTP_TRANSPORT, JSON_FACTORY, secrets, scopes).setCredentialStore(credentialStore).setAccessType("offline").setApprovalPrompt("force").build()
  }

  public authorized() {
    if(secrets == null) {
      return false;
    }
    else {
      return (this.build().loadCredential('administrator') != null)
    }
  }

  private static final INSTANCE = new CodeFlow()
  static synchronized getInstance(){ return INSTANCE }
  private CodeFlow() {}
}
