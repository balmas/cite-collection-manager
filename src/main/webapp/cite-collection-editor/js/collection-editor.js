(function() {
  var FUSION_TABLES_URI, add_property_to_form, build_collection_editor_from_capabilities, build_collection_form, build_input_for_property, build_input_for_valuelist, check_table_access, cite_urn, clear_collection_form, clippy, construct_latest_urn, default_cite_collection_editor_config, delete_cookie, disable_collection_form, disable_submit, expires_in_to_date, filter_url_params, fusion_tables_escape, fusion_tables_query, get_cookie, get_value_for_form_input, google_oauth_parameters_for_fusion_tables, google_oauth_url, load_collection_form, load_collection_form_from_urn, merge_config_parameters, pagedown_editors, parse_query_string, push_selected_collection, save_collection_form, scroll_to_bottom, set_access_token_cookie, set_author_name, set_cookie, set_selected_collection_from_hash_parameters, submit_collection_form, update_timestamp_inputs;

  FUSION_TABLES_URI = 'https://www.googleapis.com/fusiontables/v1';

  default_cite_collection_editor_config = {
    google_client_id: '891199912324.apps.googleusercontent.com',
    capabilities_url: 'capabilities/testedit-capabilities.xml'
  };

  google_oauth_parameters_for_fusion_tables = {
    response_type: 'token',
    redirect_uri: window.location.href.replace("" + location.hash, ''),
    scope: 'https://www.googleapis.com/auth/fusiontables https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
    approval_prompt: 'auto'
  };

  google_oauth_url = function() {
    return "https://accounts.google.com/o/oauth2/auth?" + ($.param(google_oauth_parameters_for_fusion_tables));
  };

  cite_urn = function(namespace, collection, row, prefix, version) {
    var urn;
    if (prefix == null) {
      prefix = '';
    }
    urn = "urn:cite:" + namespace + ":" + collection + "." + prefix + row;
    if (arguments.length === 5) {
      urn += "." + version;
    }
    return urn;
  };

  pagedown_editors = {};

  disable_collection_form = function() {
    $('#collection_form').children().prop('disabled', true);
    $('.wmd-input').prop('disabled', true);
    return $('.btn').prop('disabled', true);
  };

  build_input_for_valuelist = function(valuelist) {
    var select, value, values, _i, _len;
    select = $('<select>').attr('style', 'display:block');
    values = $(valuelist).find('value');
    for (_i = 0, _len = values.length; _i < _len; _i++) {
      value = values[_i];
      select.append($('<option>').append($(value).text()));
    }
    return select;
  };

  update_timestamp_inputs = function() {
    return $('input[data-type=timestamp]').attr('value', (new Date).toISOString());
  };

  build_input_for_property = function(property) {
    var input, pagedown_container, pagedown_panel, pagedown_preview, pagedown_suffix;
    input = (function() {
      switch ($(property).attr('type')) {
        case 'markdown':
          pagedown_container = $('<div>').attr('class', 'pagedown_container');
          pagedown_suffix = $('<input>').attr('type', 'hidden').attr('class', 'pagedown_suffix').attr('value', $(property).attr('name'));
          pagedown_panel = $('<div>').attr('class', 'wmd-panel');
          pagedown_panel.append($('<div>').attr('id', "wmd-button-bar-" + ($(property).attr('name'))));
          pagedown_panel.append($('<textarea>').attr('class', 'wmd-input').attr('id', "wmd-input-" + ($(property).attr('name'))));
          pagedown_preview = $('<div>').attr('class', 'wmd-panel wmd-preview').attr('id', "wmd-preview-" + ($(property).attr('name')));
          pagedown_container.append(pagedown_suffix);
          pagedown_container.append(pagedown_panel);
          pagedown_container.append($('<label>').append('Preview:'));
          pagedown_container.append(pagedown_preview);
          return pagedown_container;
        case 'string':
          if ($(property).find('valueList').length > 0) {
            return build_input_for_valuelist($(property).find('valueList')[0]);
          } else {
            return $('<textarea>').attr('style', 'width:100%').attr('rows', '1');
          }
          break;
        case 'datetime':
        case 'authuser':
          return $('<input>').attr('style', 'width:100%;display:block');
        case 'citeurn':
        case 'citeimg':
        case 'ctsurn':
          if ($(property).attr('name') === $(property).parent().attr('canonicalId')) {
            return $('<input>').attr('style', 'width:100%').attr('data-urn', 'true').prop('disabled', true);
          } else {
            return $('<input>').attr('style', 'width:100%');
          }
          break;
        case 'timestamp':
          return $('<input>').attr('style', 'width:50%').attr('type', 'timestamp').prop('disabled', true).attr('style', 'display:block');
        default:
          console.log('Error: unknown type');
          return $('<input>');
      }
    })();
    $(input).attr('id', $(property).attr('name'));
    return $(input).attr('data-type', $(property).attr('type'));
  };

  add_property_to_form = function(property, form) {
    form.append($('<br>'));
    form.append($('<label>').attr('for', $(property).attr('name')).append($(property).attr('label') + ':').attr('style', 'display:inline'));
    if ($(property).attr('type') === 'markdown') {
      form.append($('<div>').attr('id', "wmd-input-" + ($(property).attr('name')) + "-clippy"));
    } else {
      form.append($('<div>').attr('id', "" + ($(property).attr('name')) + "-clippy"));
    }
    return form.append(build_input_for_property(property));
  };

  fusion_tables_query = function(query, callback) {
    console.log("Query: " + query);
    switch (query.split(' ')[0]) {
      case 'INSERT':
        return $.ajax("" + FUSION_TABLES_URI + "/query?access_token=" + (get_cookie('access_token')), {
          type: 'POST',
          dataType: 'json',
          crossDomain: true,
          data: {
            sql: query
          },
          error: function(jqXHR, textStatus, errorThrown) {
            console.log("AJAX Error: " + textStatus);
            $('#collection_form').after($('<div>').attr('class', 'alert alert-error').attr('id', 'submit_error').append("Error submitting data: " + textStatus));
            scroll_to_bottom();
            return $('#submit_error').delay(1800).fadeOut(1800, function() {
              $(this).remove();
              return $('#collection_select').change();
            });
          },
          success: function(data) {
            console.log(data);
            if (callback != null) {
              return callback(data);
            }
          }
        });
      case 'SELECT':
        return $.ajax("" + FUSION_TABLES_URI + "/query?sql=" + query + "&access_token=" + (get_cookie('access_token')), {
          type: 'GET',
          cache: false,
          dataType: 'json',
          crossDomain: true,
          error: function(jqXHR, textStatus, errorThrown) {
            return console.log("AJAX Error: " + textStatus);
          },
          success: function(data) {
            console.log(data);
            if (callback != null) {
              return callback(data);
            }
          }
        });
    }
  };

  get_value_for_form_input = function(element) {
    if ($(element).attr('class') === 'pagedown_container') {
      return $(element).find('.wmd-input').val();
    } else {
      return $(element).val();
    }
  };

  construct_latest_urn = function(callback) {
    var cite_urn_prefix, collection, urn_input, urn_prefix_matches, urn_prefix_regex, urn_query_value,
      _this = this;
    collection = $('#collection_select').val();
    urn_input = $('input[data-urn=true]');
    urn_query_value = parse_query_string()[urn_input.attr('id')];
    if (urn_query_value != null) {
      cite_urn_prefix = cite_urn($('#namespaceMapping').attr('value'), $('#collection_name').attr('value'), '\\d+', $('#urn_object_prefix').attr('value'));
      urn_prefix_regex = new RegExp("^(" + (cite_urn_prefix.replace('.', '\\.')) + ")(\\.\\d+)?$");
      console.log(urn_prefix_regex);
      urn_prefix_matches = urn_prefix_regex.exec(urn_query_value);
      console.log(urn_prefix_matches);
      if (urn_prefix_matches != null) {
        return fusion_tables_query("SELECT COUNT() FROM " + collection + " WHERE '" + (urn_input.attr('id')) + "' STARTS WITH '" + urn_prefix_matches[1] + ".'", function(data) {
          var existing_versions, latest_urn, loaded_urn;
          console.log(data);
          if (data['rows'] != null) {
            existing_versions = parseInt(data['rows'][0][0]);
            latest_urn = "" + urn_prefix_matches[1] + "." + (existing_versions + 1);
            console.log("Latest URN: " + latest_urn);
            loaded_urn = urn_prefix_matches[1];
            if ((urn_prefix_matches[2] != null) && (parseInt(urn_prefix_matches[2].substring(1)) <= existing_versions)) {
              loaded_urn += urn_prefix_matches[2];
            } else {
              loaded_urn += "." + existing_versions;
            }
            load_collection_form_from_urn(loaded_urn);
            return callback(latest_urn);
          } else {
            console.log("No existing versions for passed URN, constructing latest URN from scratch");
            filter_url_params(parse_query_string(), [urn_input.attr('id')]);
            return construct_latest_urn(callback);
          }
        });
      } else {
        console.log("Passed URN invalid, constructing latest URN from scratch");
        filter_url_params(parse_query_string(), [urn_input.attr('id')]);
        return construct_latest_urn(callback);
      }
    } else {
      return fusion_tables_query("SELECT COUNT() FROM " + collection, function(data) {
        var last_available, latest_urn;
        console.log(data);
        last_available = data['rows'] != null ? parseInt(data['rows'][0][0]) + 1 : 1;
        latest_urn = cite_urn($('#namespaceMapping').attr('value'), $('#collection_name').attr('value'), last_available, $('#urn_object_prefix').attr('value'), 1);
        console.log("Latest URN: " + latest_urn);
        return callback(latest_urn);
      });
    }
  };

  scroll_to_bottom = function() {
    return $('html, body').animate({
      scrollTop: $(document).height() - $(window).height()
    }, 600, 'linear');
  };

  this.save_collection_form = save_collection_form = function() {
    var child, collection, _i, _len, _ref;
    collection = $('#collection_select').val();
    localStorage[collection] = true;
    _ref = $('#collection_form').children();
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      child = _ref[_i];
      if ($(child).attr('id') && !$(child).prop('disabled') && ($(child).attr('type') !== 'hidden')) {
        localStorage["" + collection + ":" + ($(child).attr('id'))] = get_value_for_form_input(child);
      } else if (($(child).attr('id') === $('input[data-urn=true]').attr('id')) && (parse_query_string()[$(child).attr('id')] != null)) {
        localStorage["" + collection + ":" + ($(child).attr('id'))] = parse_query_string()[$(child).attr('id')];
      }
    }
    $('#collection_form').after($('<div>').attr('class', 'alert alert-success').attr('id', 'save_success').append('Saved.'));
    scroll_to_bottom();
    return $('#save_success').fadeOut(1800, function() {
      return $(this).remove();
    });
  };

  fusion_tables_escape = function(value) {
    return "'" + (value.replace(/'/g, "\\\'")) + "'";
  };

  submit_collection_form = function() {
    var collection, column_names, row_values,
      _this = this;
    disable_collection_form();
    save_collection_form();
    collection = $('#collection_select').val();
    column_names = [];
    row_values = [];
    return construct_latest_urn(function(urn) {
      var child, _i, _len, _ref;
      $('input[data-urn=true]').attr('value', urn);
      update_timestamp_inputs();
      _ref = $('#collection_form').children();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        child = _ref[_i];
        if ($(child).attr('id') && ($(child).attr('type') !== 'hidden') && !$(child).attr('id').match(/-clippy$/) && !$(child).attr('id').match(/submit_button/)) {
          column_names.push(fusion_tables_escape($(child).attr('id')));
          row_values.push(fusion_tables_escape(get_value_for_form_input(child)));
        }
      }
      return fusion_tables_query("INSERT INTO " + collection + " (" + (column_names.join(', ')) + ") VALUES (" + (row_values.join(', ')) + ")", function(data) {
        filter_url_params(parse_query_string(), [$('input[data-urn=true]').attr('id')]);
        clear_collection_form();
        $('#collection_form').after($('<div>').attr('class', 'alert alert-success').attr('id', 'submit_success').append('Submitted.'));
        scroll_to_bottom();
        return $('#submit_success').delay(1800).fadeOut(1800, function() {
          return $(this).remove();
        });
      });
    });
  };

  load_collection_form = function() {
    var child, collection, _i, _len, _ref, _results;
    collection = $('#collection_select').val();
    _ref = $('#collection_form').children();
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      child = _ref[_i];
      if ($(child).attr('id') != null) {
        if ((parse_query_string()[$(child).attr('id')] != null) && ($(child).attr('id') !== $('input[data-urn=true]').attr('id'))) {
          $(child).val(parse_query_string()[$(child).attr('id')]);
          _results.push(filter_url_params(parse_query_string(), [$(child).attr('id')]));
        } else if (localStorage["" + collection + ":" + ($(child).attr('id'))] != null) {
          if ($(child).attr('class') === 'pagedown_container') {
            _results.push($(child).find('.wmd-input').val(localStorage["" + collection + ":" + ($(child).attr('id'))]));
          } else if ($(child).attr('id') === $('input[data-urn=true]').attr('id')) {
            _results.push(history.replaceState(null, '', window.location.href.replace("" + location.hash, "" + location.hash + "&" + ($(child).attr('id')) + "=" + localStorage["" + collection + ":" + ($(child).attr('id'))])));
          } else {
            _results.push($(child).val(localStorage["" + collection + ":" + ($(child).attr('id'))]));
          }
        } else {
          _results.push(void 0);
        }
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  load_collection_form_from_urn = function(loaded_urn) {
    var collection;
    collection = $('#collection_select').val();
    if (localStorage["" + collection + ":" + ($('input[data-urn=true]').attr('id'))] == null) {
      console.log("Loading data from: " + loaded_urn);
      return fusion_tables_query("SELECT * FROM " + collection + " WHERE '" + ($('input[data-urn=true]').attr('id')) + "' = '" + loaded_urn + "'", function(data) {
        var header, i, _i, _len, _ref, _results;
        console.log("Existing data:");
        console.log(data);
        _ref = data['columns'];
        _results = [];
        for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
          header = _ref[i];
          if (!$("#" + header).prop('disabled')) {
            console.log("Setting " + header + " to " + data['rows'][0][i]);
            if ($("#" + header).attr('class') === 'pagedown_container') {
              $("#wmd-input-" + header).val(data['rows'][0][i]);
              if (pagedown_editors[header] != null) {
                _results.push(pagedown_editors[header].refreshPreview());
              } else {
                _results.push(void 0);
              }
            } else {
              _results.push($("#" + header).val(data['rows'][0][i]));
            }
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      });
    }
  };

  clear_collection_form = function() {
    var child, collection, _i, _len, _ref;
    collection = $('#collection_select').val();
    localStorage.removeItem(collection);
    _ref = $('#collection_form').children();
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      child = _ref[_i];
      if ($(child).attr('id')) {
        localStorage.removeItem("" + collection + ":" + ($(child).attr('id')));
      }
    }
    return $('#collection_select').change();
  };

  check_table_access = function(table_id, callback) {
    if (get_cookie('access_token')) {
      return $.ajax("" + FUSION_TABLES_URI + "/tables/" + table_id + "?access_token=" + (get_cookie('access_token')), {
        type: 'GET',
        dataType: 'json',
        crossDomain: true,
        error: function(jqXHR, textStatus, errorThrown) {
          console.log("AJAX Error: " + textStatus);
          $('.container > h1').after($('<div>').attr('class', 'alert alert-error').attr('id', 'collection_access_error').append('You do not have permission to access this collection.'));
          return disable_collection_form();
        },
        success: function(data) {
          return console.log(data);
        },
        complete: function(jqXHR, textStatus) {
          if (callback != null) {
            return callback();
          }
        }
      });
    }
  };

  build_collection_form = function(collection) {
    var authorization_expires_in, clear_button, converter, form, properties, property, save_button, submit_button, suffix, _i, _j, _k, _len, _len1, _len2, _ref,
      _this = this;
    form = $('<form>').attr('id', 'collection_form');
    form.append($('<input>').attr('type', 'hidden').attr('id', 'namespaceMapping').attr('value', $(collection).find('namespaceMapping').attr('abbr')));
    form.append($('<input>').attr('type', 'hidden').attr('id', 'collection_name').attr('value', $(collection).attr('name')));
    form.append($('<input>').attr('type', 'hidden').attr('id', 'urn_object_prefix').attr('value', $(collection).find("citeProperty[name='" + ($(collection).attr('canonicalId')) + "']").attr('objectPrefix')));
    properties = $(collection).find('citeProperty');
    for (_i = 0, _len = properties.length; _i < _len; _i++) {
      property = properties[_i];
      add_property_to_form(property, form);
    }
    submit_button = $('<input>').attr('type', 'button').attr('value', 'Submit').attr('class', 'btn btn-primary').attr('id', 'submit_button');
    submit_button.bind('click', function(event) {
      return submit_collection_form();
    });
    save_button = $('<input>').attr('type', 'button').attr('value', 'Save').attr('class', 'btn');
    save_button.bind('click', function(event) {
      return save_collection_form();
    });
    clear_button = $('<input>').attr('type', 'button').attr('value', 'Clear').attr('class', 'btn btn-danger').attr('style', 'float:right');
    clear_button.bind('click', function(event) {
      if (confirm('Are you sure you wish to clear the form? This action cannot be undone.')) {
        return clear_collection_form();
      }
    });
    form.append($('<br>'));
    form.append(submit_button);
    form.append('&nbsp;&nbsp;');
    form.append(save_button);
    form.append(clear_button);
    $('.container').append(form);
    check_table_access($(collection).attr('class'));
    load_collection_form();
    set_author_name();
    construct_latest_urn(function(urn) {
      return $('input[data-urn=true]').attr('value', urn);
    });
    update_timestamp_inputs();
    converter = new Markdown.Converter();
    _ref = $(".pagedown_suffix");
    for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
      suffix = _ref[_j];
      console.log("Running Markdown editor for: " + ($(suffix).val()));
      pagedown_editors[$(suffix).val()] = new Markdown.Editor(converter, "-" + ($(suffix).val()));
      pagedown_editors[$(suffix).val()].run();
    }
    if (swfobject.hasFlashPlayerVersion('9')) {
      for (_k = 0, _len2 = properties.length; _k < _len2; _k++) {
        property = properties[_k];
        if ($(property).attr('type') === 'markdown') {
          clippy("wmd-input-" + ($(property).attr('name')));
        } else {
          clippy($(property).attr('name'));
        }
      }
    }
    $('textarea').autosize();
    if (get_cookie('access_token_expires_at')) {
      authorization_expires_in = parseInt(get_cookie('access_token_expires_at')) - Date.now();
      console.log("Disabling submit in " + authorization_expires_in + "ms");
      return setTimeout(function() {
        return disable_submit();
      }, authorization_expires_in);
    }
  };

  set_author_name = function(callback) {
    if (get_cookie('author_name')) {
      $('input[data-type=authuser]').attr('value', get_cookie('author_name'));
      return $('input[data-type=authuser]').prop('disabled', true);
    } else if (get_cookie('access_token')) {
      return $.ajax("https://www.googleapis.com/oauth2/v1/userinfo?access_token=" + (get_cookie('access_token')), {
        type: 'GET',
        dataType: 'json',
        crossDomain: true,
        error: function(jqXHR, textStatus, errorThrown) {
          return console.log("AJAX Error: " + textStatus);
        },
        success: function(data) {
          set_cookie('author_name', "" + data['name'] + " <" + data['email'] + ">", 3600);
          $('input[data-type=authuser]').attr('value', get_cookie('author_name'));
          return $('input[data-type=authuser]').prop('disabled', true);
        },
        complete: function(jqXHR, textStatus) {
          if (callback != null) {
            return callback();
          }
        }
      });
    }
  };

  parse_query_string = function(query_string) {
    var m, params, regex;
    if (query_string == null) {
      query_string = location.hash.substring(1);
    }
    params = {};
    if (query_string.length > 0) {
      regex = /([^&=]+)=([^&]*)/g;
      while (m = regex.exec(query_string)) {
        params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
      }
    }
    return params;
  };

  filter_url_params = function(params, filtered_params) {
    var hash_string, key, rewritten_params, value;
    rewritten_params = [];
    if (filtered_params == null) {
      filtered_params = ['access_token', 'expires_in', 'token_type'];
    }
    for (key in params) {
      value = params[key];
      if (!_.include(filtered_params, key)) {
        rewritten_params.push("" + key + "=" + value);
      }
    }
    if (rewritten_params.length > 0) {
      hash_string = "#" + (rewritten_params.join('&'));
    } else {
      hash_string = '';
    }
    history.replaceState(null, '', window.location.href.replace("" + location.hash, hash_string));
    return params;
  };

  expires_in_to_date = function(expires_in) {
    var cookie_expires;
    cookie_expires = new Date;
    cookie_expires.setTime(cookie_expires.getTime() + expires_in * 1000);
    return cookie_expires;
  };

  set_cookie = function(key, value, expires_in) {
    var cookie;
    cookie = "" + key + "=" + value + "; ";
    cookie += "expires=" + (expires_in_to_date(expires_in).toUTCString()) + "; ";
    cookie += "path=" + (window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1));
    return document.cookie = cookie;
  };

  delete_cookie = function(key) {
    return set_cookie(key, null, -1);
  };

  get_cookie = function(key) {
    var cookie_fragment, _i, _len, _ref;
    key += "=";
    _ref = document.cookie.split(';');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      cookie_fragment = _ref[_i];
      cookie_fragment = cookie_fragment.replace(/^\s+/, '');
      if (cookie_fragment.indexOf(key) === 0) {
        return cookie_fragment.substring(key.length, cookie_fragment.length);
      }
    }
    return null;
  };

  set_access_token_cookie = function(params, callback) {
    if (params['state'] != null) {
      console.log("Replacing hash with state: " + params['state']);
      history.replaceState(null, '', window.location.href.replace("" + location.hash, "#" + params['state']));
    }
    if (params['access_token'] != null) {
      return $.ajax("https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" + params['access_token'], {
        type: 'GET',
        dataType: 'json',
        crossDomain: true,
        error: function(jqXHR, textStatus, errorThrown) {
          return console.log("Access Token Validation Error: " + textStatus);
        },
        success: function(data) {
          set_cookie('access_token', params['access_token'], params['expires_in']);
          set_cookie('access_token_expires_at', expires_in_to_date(params['expires_in']).getTime(), params['expires_in']);
          return $('#collection_select').change();
        },
        complete: function(jqXHR, textStatus) {
          if (callback != null) {
            return callback();
          }
        }
      });
    }
  };

  clippy = function(id) {
    var flashparams, flashvars, objectattrs;
    console.log("Clippy: " + id);
    flashvars = {
      id: "" + id
    };
    flashparams = {
      quality: 'high',
      allowscriptaccess: 'always',
      scale: 'noscale'
    };
    objectattrs = {
      classid: 'clsid:d27cdb6e-ae6d-11cf-96b8-444553540000',
      style: "padding-left:5px;padding-top:5px;background-position:5px 5px;background-repeat:no-repeat;background-image:url('vendor/clippy/button_up.png')"
    };
    return swfobject.embedSWF("vendor/clippy/clippy.swf", "" + id + "-clippy", "110", "14", "9", false, flashvars, flashparams, objectattrs);
  };

  set_selected_collection_from_hash_parameters = function() {
    if (parse_query_string()['collection'] != null) {
      $("option[data-name=" + (parse_query_string()['collection']) + "]").attr('selected', 'selected');
      return $('#collection_select').change();
    }
  };

  push_selected_collection = function() {
    var new_hash, new_url, selected;
    selected = $('#collection_select option:selected')[0];
    new_hash = "#collection=" + ($(selected).attr('data-name'));
    filter_url_params(parse_query_string(), ['collection']);
    new_url = location.hash.length > 0 ? window.location.href.replace("" + location.hash, "" + new_hash + "&" + (location.hash.substring(1))) : window.location.href + new_hash;
    return history.pushState(null, $(selected).text(), new_url);
  };

  disable_submit = function() {
    $('#submit_button').prop('disabled', true);
    $('#submit_button').before($('<div>').attr('class', 'alert alert-warning').attr('id', 'oauth_expiration_warning').append('Your Google Fusion Tables authorization has expired. '));
    $('#oauth_expiration_warning').append($('<a>').attr('href', google_oauth_url()).append('Click here to save your work and re-authorize.').attr('onclick', 'save_collection_form()'));
    return $('#oauth_expiration_warning').append(' You will be able to submit your work upon return.');
  };

  build_collection_editor_from_capabilities = function(capabilities_url) {
    return $.ajax(capabilities_url, {
      type: 'GET',
      dataType: 'xml',
      error: function(jqXHR, textStatus, errorThrown) {
        console.log("AJAX Error: " + textStatus);
        return $('.container > h1').after($('<div>').attr('class', 'alert alert-error').append("Error loading the collection capabilities URL \"" + cite_collection_editor_config['capabilities_url'] + "\"."));
      },
      success: function(data) {
        var collection, collections, select, _i, _len,
          _this = this;
        collections = $(data).find('citeCollection');
        select = $('<select>');
        for (_i = 0, _len = collections.length; _i < _len; _i++) {
          collection = collections[_i];
          select.append($('<option>').attr('value', $(collection).attr('class')).attr('data-name', $(collection).attr('name')).append($(collection).attr('description')));
        }
        $(select).attr('id', 'collection_select');
        $(select).attr('style', 'width:100%');
        $('.container').append(select);
        set_selected_collection_from_hash_parameters();
        window.onpopstate = function(event) {
          $('#collection_select').chosen();
          return set_selected_collection_from_hash_parameters();
        };
        $('#collection_select').chosen();
        $('#collection_select').bind('change', function(event) {
          var selected, selected_collection;
          $('#collection_select').trigger("liszt:updated");
          $('#collection_form').remove();
          $('.alert').remove();
          selected = $('#collection_select option:selected')[0];
          selected_collection = $(data).find("citeCollection[class=" + ($(selected).attr('value')) + "]")[0];
          push_selected_collection();
          build_collection_form(selected_collection);
          if (!get_cookie('access_token')) {
            $('.container > h1').after($('<div>').attr('class', 'alert alert-warning').attr('id', 'oauth_access_warning').append('You have not authorized this application to access your Google Fusion Tables. '));
            $('#oauth_access_warning').append($('<a>').attr('href', google_oauth_url()).append('Click here to authorize.'));
            return disable_collection_form();
          }
        });
        return $('#collection_select').change();
      }
    });
  };

  merge_config_parameters = function() {
    var cite_collection_editor_config;
    if (window.FUSION_TABLES_URI != null) {
      FUSION_TABLES_URI = window.FUSION_TABLES_URI;
    }
    cite_collection_editor_config = $.extend({}, default_cite_collection_editor_config, window.cite_collection_editor_config);
    google_oauth_parameters_for_fusion_tables['client_id'] = cite_collection_editor_config['google_client_id'];
    if (location.hash.substring(1).length && !(parse_query_string()['state'])) {
      console.log("Setting OAuth URL parameter state: " + (location.hash.substring(1)));
      google_oauth_parameters_for_fusion_tables['state'] = location.hash.substring(1);
    }
    return cite_collection_editor_config;
  };

  $(document).ready(function() {
    var cite_collection_editor_config;
    if (!$('#qunit').length) {
      cite_collection_editor_config = merge_config_parameters();
      set_access_token_cookie(filter_url_params(parse_query_string()));
      return build_collection_editor_from_capabilities(cite_collection_editor_config['capabilities_url']);
    }
  });

}).call(this);
