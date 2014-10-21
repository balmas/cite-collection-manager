package edu.harvard.chs.citecollectionmanager

import com.google.api.client.auth.oauth2.Credential
import com.google.api.services.fusiontables.Fusiontables
import com.google.api.services.fusiontables.Fusiontables.Builder
import com.google.api.services.fusiontables.model.Table
import com.google.api.services.fusiontables.model.TableList
import com.google.api.services.fusiontables.model.Sqlresponse
import com.google.api.services.oauth2.Oauth2
import com.google.api.services.oauth2.Oauth2.Builder
import com.google.api.services.oauth2.model.Tokeninfo
import com.google.api.services.oauth2.model.Userinfoplus
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential.Builder

import java.io.*
import java.net.URL
import java.util.*
import javax.servlet.*
import javax.servlet.http.*

import edu.harvard.chs.citecollectionmanager.CodeFlow
import edu.harvard.chs.citecollectionmanager.UserAuthorization

public class FusionTablesServlet extends HttpServlet {
  /**
   * Handle a servlet GET request
   */
  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response)
    throws ServletException, IOException
  {
    String user_access_token = request.getParameter("access_token")
    GoogleCredential google_credential = new GoogleCredential().setAccessToken(user_access_token)
    Oauth2 oauth2 = new Oauth2.Builder(CodeFlow.HTTP_TRANSPORT, CodeFlow.JSON_FACTORY, google_credential).build()
    Userinfoplus userinfo = oauth2.userinfo().get().execute()
    
    UserAuthorization user_authorization = new UserAuthorization(userinfo)

    if(user_authorization.authorized()) {
      Credential credential = CodeFlow.instance.build().loadCredential('administrator')
      String table_id = request.getRequestURL().toString().split("/").last()
      Fusiontables fusiontables = new Fusiontables.Builder(CodeFlow.HTTP_TRANSPORT, CodeFlow.JSON_FACTORY, credential).build()

      Table table = fusiontables.table().get(table_id).execute()

      response.setContentType("text/html;charset=UTF-8")
      response.setStatus(HttpServletResponse.SC_OK)
      PrintWriter out = response.getWriter()

      out.println(table.toPrettyString())
    }
    else {
      response.setStatus(HttpServletResponse.SC_FORBIDDEN)
    }
  }
}
