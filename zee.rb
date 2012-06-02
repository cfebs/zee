require 'sinatra'

get '/' do
  erb :index, :layout => :application
end
