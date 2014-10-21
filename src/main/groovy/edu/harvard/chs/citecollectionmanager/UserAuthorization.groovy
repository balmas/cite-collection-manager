package edu.harvard.chs.citecollectionmanager

import com.google.api.client.auth.oauth2.Credential
import com.google.api.services.fusiontables.Fusiontables
import com.google.api.services.fusiontables.Fusiontables.Builder
import com.google.api.services.fusiontables.model.Table
import com.google.api.services.fusiontables.model.TableList
import com.google.api.services.fusiontables.model.Sqlresponse
import com.google.api.services.oauth2.model.Userinfoplus

import edu.harvard.chs.citecollectionmanager.CodeFlow

import java.util.Properties

class UserAuthorization {
  public static String table_id = getTableId()
  private static final String blocked_default = "false"
  private static final Object lock = new Object()
  private Fusiontables fusiontables;
  private Credential credential;
  private Userinfoplus user;
  private Map table_user;

  private static String getTableId() {
    Properties prop = new Properties()
    InputStream input_stream = UserAuthorization.class.getResourceAsStream("build.properties")
    prop.load(input_stream)
    input_stream.close()
    return prop.getProperty("authorizationTable")
  }

  public boolean authorized() {
    System.out.println(table_user.toString())
    if((table_user == null) || (table_user["blocked"].equals("true"))) {
      return false
    }
    else {
      return true
    }
  }

  private getUserFromTable() {
    String sql = "SELECT 'E-Mail', Name, Blocked FROM " + table_id + " WHERE 'E-Mail' = '" + user.getEmail() + "' LIMIT 1"
    System.out.println("Running SQL: " + sql)
    Sqlresponse response = fusiontables.query().sql(sql).execute()
    if((response != null) && (response.getRows() != null) && (!(response.getRows().isEmpty()))) {
      def row = response.getRows().first()
      def usermap = [email:row[0], name:row[1], blocked:row[2]]
      return usermap
    }
    else {
      return null
    }
  }

  private createUserInTable() {
    synchronized(lock) {
      table_user = this.getUserFromTable()
      if(table_user == null) {
        String sql = "INSERT INTO " + table_id + " ('E-Mail', Name, Blocked) VALUES ('" + user.getEmail() + "', '" + user.getName() + "', '" + blocked_default + "')"
        System.out.println("Running SQL: " + sql)
        Sqlresponse response = fusiontables.query().sql(sql).execute()
        System.out.println(response.toPrettyString())
        table_user = this.getUserFromTable()
      }
    }
  }

  public UserAuthorization(Userinfoplus user) {
    System.out.println("Creating UserAuthorization")
    this.user = user
    credential = CodeFlow.instance.build().loadCredential('administrator')
    fusiontables = new Fusiontables.Builder(CodeFlow.HTTP_TRANSPORT, CodeFlow.JSON_FACTORY, credential).build()
    this.createUserInTable()
  }
}
